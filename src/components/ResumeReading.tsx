/**
 * قسم «استئناف القراءة» في الواجهة الرئيسية — مطابق لقسم التطبيق:
 * بطاقة آخر رواية قُرئت (غلاف + عنوان + آخر فصل + شريط تقدم + نسبة)
 * وتنقلك مباشرة لآخر فصل وصلت إليه.
 *
 * المصدر:
 * - المسجّلون: GET /api/novel/library?type=history (نفس مصدر التطبيق حرفياً)
 * - الزوار: مفاتيح localStorage (last_read_* + read_chapters_*) — نفس مفاتيح القارئ
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpenCheck, Play, History, ChevronLeft } from 'lucide-react';
import SafeImage from './SafeImage';
import { novelService } from '../services/novel';
import { readJSON } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

interface ResumeItem {
  novelId: string;
  title: string;
  cover: string;
  lastChapterId: number;
  lastChapterTitle: string;
  progress: number;
}

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

// مصدر الزوار: آخر last_read_* حسب الوقت، مع جلب بيانات الرواية (غلاف/عدد الفصول)
async function loadGuestResume(): Promise<ResumeItem | null> {
  try {
    const entries: { novelId: string; id: number; title: string; time: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('last_read_')) continue;
      const val = readJSON<{ id?: number; title?: string; time?: string }>(key, {});
      if (!val || typeof val.id !== 'number' || val.id <= 0) continue;
      entries.push({
        novelId: key.replace('last_read_', ''),
        id: val.id,
        title: val.title || '',
        time: val.time || '',
      });
    }
    if (entries.length === 0) return null;
    entries.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    const last = entries[0];
    const novel = await novelService.getNovelById(last.novelId).catch(() => null);
    const readChapters = readJSON<number[]>(`read_chapters_${last.novelId}`, []);
    const total = (novel as any)?.chaptersCount || 0;
    const progress = total > 0 ? Math.min(100, Math.round((readChapters.length / total) * 100)) : 0;
    return {
      novelId: last.novelId,
      title: (novel as any)?.title || 'رواية',
      cover: (novel as any)?.cover || '',
      lastChapterId: last.id,
      lastChapterTitle: last.title || `الفصل ${last.id}`,
      progress,
    };
  } catch {
    return null;
  }
}

export default function ResumeReading() {
  const { userInfo } = useAuth();
  const [item, setItem] = useState<ResumeItem | null>(null);
  const [checked, setChecked] = useState(false); // انتهى الفحص (لمنع الوميض)

  useEffect(() => {
    let alive = true;
    (async () => {
      setChecked(false);
      setItem(null);
      if (userInfo && isOnline()) {
        try {
          // نفس نداء التطبيق: أول عنصر من سجل القراءة = آخر ما قُرئ
          const history = await novelService.getUserLibrary(undefined, 'history', 1, 5);
          if (!alive) return;
          const first = (Array.isArray(history) ? history : []).find(
            (h: any) => h && h.novelId && (h.lastChapterId || 0) > 0
          );
          if (first) {
            setItem({
              novelId: first.novelId,
              title: first.title || 'رواية',
              cover: first.cover || '',
              lastChapterId: first.lastChapterId,
              lastChapterTitle: first.lastChapterTitle || `الفصل ${first.lastChapterId}`,
              progress: Math.max(1, Math.min(100, first.progress || 0)),
            });
          }
        } catch {
          /* لا قسم عند الفشل — الرئيسية لا تتعطل */
        }
      } else if (!isOnline()) {
        // دون اتصال: اعتمد التخزين المحلي فقط
        const local = await loadGuestResume();
        if (alive) setItem(local);
      } else {
        const local = await loadGuestResume();
        if (alive) setItem(local);
      }
      if (alive) setChecked(true);
    })();
    return () => {
      alive = false;
    };
  }, [userInfo]);

  if (!checked && !item) return null; // فحص صامت — لا فراغ ولا وميض
  if (!item) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="px-4 md:px-8 mt-8"
      aria-label="استئناف القراءة"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={22} className="text-white" />
            <h2 className="text-xl font-bold">استئناف القراءة</h2>
          </div>
          <Link
            to="/history"
            className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-white transition-colors"
          >
            <History size={14} />
            السجل
            <ChevronLeft size={14} />
          </Link>
        </div>

        <Link
          to={`/novel/${item.novelId}/reader/${item.lastChapterId}`}
          className="group block bg-[#111111] border border-white/10 rounded-2xl p-4 hover:border-white/25 hover:bg-[#141414] transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-24 sm:w-[72px] sm:h-[104px] rounded-xl overflow-hidden shrink-0 bg-[#1a1a1a] relative">
              {item.cover ? (
                <SafeImage src={item.cover} alt={item.title} className="w-full h-full object-cover select-none" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <BookOpenCheck size={22} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full mb-1.5">
                تابع من حيث توقفت
              </span>
              <h3 className="font-bold text-white text-[15px] sm:text-base truncate">{item.title}</h3>
              <p className="text-[13px] text-white/50 truncate mt-0.5">{item.lastChapterTitle}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${item.progress}%` }} />
                </div>
                <span className="text-[11px] font-bold text-white/60 shrink-0">{item.progress}% مكتمل</span>
              </div>
            </div>

            <div className="shrink-0 w-11 h-11 rounded-full bg-white text-black items-center justify-center hidden sm:flex group-hover:scale-110 transition-transform">
              <Play size={18} className="fill-black -scale-x-100" />
            </div>
          </div>
        </Link>
      </div>
    </motion.section>
  );
}
