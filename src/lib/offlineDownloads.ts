/**
 * محرك تنزيل الفصول للقراءة دون اتصال.
 *
 * - يجلب قوائم الفصول من الخادم (مكشوفة أصلاً في apiCache) ويختار النطاق.
 * - يخطّي الفصول المنزّلة مسبقاً → الاستئناف مجاني.
 * - ثلاثة فصول متزامنة كحد أقصى (لطيف مع الخادم وسريع كفاية).
 * - تقدم حي عبر onProgress + إيقاف/استئناف + تحديث فصول جديدة.
 * - كل تغيير يُطلق `moon-offline-change` فتنقدح الواجهات فوراً.
 */

import { novelService } from '../services/novel';
import { offlineStore, estimateBytes, OfflineChapter, OfflineNovel } from './offlineStore';

export type DownloadPhase = 'preparing' | 'downloading' | 'done' | 'cancelled' | 'error';

export interface DownloadProgress {
  novelId: string;
  phase: DownloadPhase;
  /** فصل منجز / إجمالي المطلوب في هذه الجولة */
  done: number;
  total: number;
  currentTitle?: string;
  failed: number;
  message?: string;
}

type ProgressCb = (p: DownloadProgress) => void;

interface RunningJob {
  stop: boolean;
}

const running = new Map<string, RunningJob>();
const lastProgress = new Map<string, DownloadProgress>();

const CONCURRENCY = 3;

export const offlineEngine = {
  isRunning(novelId: string): boolean {
    return running.has(novelId);
  },

  getProgress(novelId: string): DownloadProgress | undefined {
    return lastProgress.get(novelId);
  },

  /** إيقاف جولة التنزيل الجارية لهذه الرواية */
  stop(novelId: string): void {
    const job = running.get(novelId);
    if (job) job.stop = true;
  },

  /**
   * تنزيل فصول النطاق [from..to] (الأرقام فصول وليست فهارس).
   * `to` يُقصّ تلقائياً على إجمالي فصول الخادم الفعلي.
   */
  async download(
    novel: { _id: string; title: string; cover?: string; author?: string; description?: string; chaptersCount?: number },
    opts: { from?: number; to?: number; onProgress?: ProgressCb } = {},
  ): Promise<DownloadProgress> {
    const novelId = novel._id;
    if (running.has(novelId)) {
      return lastProgress.get(novelId) || { novelId, phase: 'error', done: 0, total: 0, failed: 0, message: 'جولة تنزيل جارية بالفعل' };
    }

    const job: RunningJob = { stop: false };
    running.set(novelId, job);
    const onProgress: ProgressCb = (p) => {
      lastProgress.set(novelId, p);
      try { opts.onProgress?.(p); } catch { /* ignore */ }
    };

    let progress: DownloadProgress = { novelId, phase: 'preparing', done: 0, total: 0, failed: 0 };
    onProgress(progress);

    try {
      // ---------- 1) وصف الرواية في المخزن (قبل أي شيء ليظهر فوراً في الصفحة) ----------
      const from = Math.max(1, Math.floor(opts.from ?? 1));
      const existingNovel = await offlineStore.getNovel(novelId);
      await offlineStore.putNovel({
        _id: novel._id,
        title: novel.title,
        cover: novel.cover,
        author: novel.author,
        description: novel.description,
        chaptersCount: Math.max(novel.chaptersCount || 0, existingNovel?.chaptersCount || 0),
        chapterNumbers: existingNovel?.chapterNumbers || [],
        chapterTitles: existingNovel?.chapterTitles || {},
        bytes: existingNovel?.bytes || 0,
        downloadedAt: existingNovel?.downloadedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReadNumber: existingNovel?.lastReadNumber,
      });

      // ---------- 2) تنزيل تدفقي صفحة-بصفحة (فوري بعد أول صفحة) ----------
      const already = new Set(existingNovel?.chapterNumbers || []);
      const pageLimit = 100;
      let done = 0;
      let failed = 0;
      let serverTotal = 0;
      let plannedTotal = 0;

      const downloadOne = async (meta: { number: number; title: string }) => {
        try {
          let full: any = null;
          // محاولة واحدة بديلة عند الفشل (الخادم يتعثر أحياناً تحت التزامن)
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              full = await novelService.getChapter(novelId, String(meta.number));
              break;
            } catch (e) {
              if (attempt === 1) throw e;
              await new Promise((r) => setTimeout(r, 600));
            }
          }
          if (job.stop) return;
          const content = full?.content || '';
          const chapter: OfflineChapter = {
            novelId,
            number: meta.number,
            serverId: full?._id,
            title: full?.title || meta.title,
            content,
            copyrightStart: full?.copyrightStart,
            copyrightEnd: full?.copyrightEnd,
            copyrightStyles: full?.copyrightStyles,
            bytes: estimateBytes(content),
            savedAt: new Date().toISOString(),
          };
          await offlineStore.putChapter(chapter);
          await offlineStore.registerChapter(novelId, { number: meta.number, title: chapter.title, bytes: chapter.bytes });
        } catch {
          failed++;
        }
        done++;
        progress = { ...progress, phase: 'downloading', done, failed, total: plannedTotal, currentTitle: meta.title };
        onProgress(progress);
      };

      for (let page = 1; ; page++) {
        if (job.stop) throw new DownloadCancelled();
        const res = await novelService.getChaptersListFull(novelId, page, pageLimit, 'asc');
        serverTotal = Math.max(serverTotal, res.total || 0);
        // الحد الأقصى الحقيقي = أكبر رقم فصل موجود (لا نفترض ترقيماً بلا فجوات)
        const maxInPage = (res.chapters || []).reduce((m: number, c: any) => Math.max(m, parseInt(String(c.number)) || 0), 0);
        const desiredTo = Math.floor(opts.to ?? serverTotal ?? 0);
        const to = Math.min(Math.max(from, desiredTo), maxInPage || desiredTo);
        const inRange = (res.chapters || [])
          .map((c: any) => ({ number: parseInt(String(c.number)), title: c.title || `فصل ${c.number}` }))
          .filter((c: any) => Number.isFinite(c.number) && c.number >= from && c.number <= to && !already.has(c.number))
          .sort((a: any, b: any) => a.number - b.number);

        // الإجمالي المتوقع للجولة كلها (يُحسب من أول صفحة: النطاق ناقص المنزّل سابقاً)
        if (plannedTotal === 0) {
          const toEstimate = desiredTo || maxInPage || serverTotal;
          const alreadyInRangeCount = Array.from(already).filter((n) => n >= from && n <= toEstimate).length;
          plannedTotal = Math.max(0, toEstimate - from + 1 - alreadyInRangeCount);
          progress = { ...progress, phase: 'downloading', total: plannedTotal };
          onProgress(progress);
        }

        // صفحة الحالية بـ CONCURRENCY متزامنة
        for (let i = 0; i < inRange.length; i += CONCURRENCY) {
          if (job.stop) throw new DownloadCancelled();
          await Promise.all(inRange.slice(i, i + CONCURRENCY).map(downloadOne));
        }

        if (!res.totalPages || page >= res.totalPages || (res.chapters || []).length === 0) break;
      }
      if (job.stop) throw new DownloadCancelled();

      // ---------- 5) إنهاء ----------
      const finalNovel = await offlineStore.getNovel(novelId);
      const finalCount = finalNovel?.chapterNumbers?.length || 0;
      progress = {
        novelId,
        phase: 'done',
        done: done,
        total: plannedTotal || done,
        failed,
        message:
          done === 0
            ? `كل فصول النطاق منزّلة مسبقاً (${finalCount} فصلاً في المكتبة المحلية)`
            : `تم تنزيل ${done - failed} فصلاً${failed ? ` — تعذّر ${failed} فصلاً (ضغط على الخادم غالباً)` : ''} — الإجمالي المحلي ${finalCount}${failed ? ' — اضغط «تحديث» لاحقاً لاستكمال الباقي مجاناً' : ''}`,
      };
      onProgress(progress);
      // 🔥 تهيئة القارئ للعمل دون اتصال: نحمّل chunk القارئ الآن (أونلاين)
      // حتى يُخزّنه Service Worker ويشتغل فوراً لاحقاً دون إنترنت.
      import('../screens/Reader').catch(() => { /* أفضل جهد */ });
      return progress;
    } catch (err: any) {
      if (err instanceof DownloadCancelled || err?.name === 'DownloadCancelled') {
        progress = { ...progress, phase: 'cancelled', message: 'أُوقف التنزيل — يمكنك الاستئناف لاحقاً وسيُخطّى ما تم' };
        onProgress(progress);
        return progress;
      }
      progress = { ...progress, phase: 'error', message: err?.message || 'فشل التنزيل — تحقق من اتصالك وأعد المحاولة' };
      onProgress(progress);
      return progress;
    } finally {
      running.delete(novelId);
      // نبّه الواجهات دائماً حتى تتحدث الأرقام النهائية
      try { window.dispatchEvent(new CustomEvent('moon-offline-change', { detail: { novelId } })); } catch { /* ignore */ }
    }
  },

  /**
   * تحديث: يجلب الفصول الأحدث من آخر تنزيل (النطاق كامل مع تخطي
   * الموجود → يجلب الجديد فقط).
   */
  async fetchNewChapters(
    novel: { _id: string; title: string; cover?: string; author?: string; description?: string; chaptersCount?: number },
    onProgress?: ProgressCb,
  ): Promise<DownloadProgress> {
    return offlineEngine.download(novel, { from: 1, to: novel.chaptersCount, onProgress });
  },
};

class DownloadCancelled extends Error {
  name = 'DownloadCancelled';
}

/** قراءة رواية منزّلة ككائن OfflineNovel — غلاف مريح للاستيراد */
export type { OfflineNovel };
