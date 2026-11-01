import React, { useEffect, useRef, useState } from 'react';
import { automationService, type AutomationJob, type ChapterProgress, type JobInput, type JobKind } from '../../services/automation';
import { translatorService } from '../../services/translator';
import { btnGhost, btnPrimary, inputCls, PageHead } from './shared';
export const jobLabels: Record<string, string> = {
  queued: 'في الانتظار', running: 'قيد التنفيذ', retry_wait: 'بانتظار إعادة المحاولة', paused: 'متوقفة مؤقتًا',
  blocked: 'تحتاج معالجة', failed: 'فشلت', cancelled: 'ملغاة', completed: 'مكتملة',
};
const kinds: Record<JobKind, string> = { scrape: 'سحب الفصول', smart_translate: 'ترجمة ذكية مع المصطلحات', pure_translate: 'ترجمة بالمسرد الجاهز', glossary_extract: 'استخراج المصطلحات' };
const stages: Record<string, string> = { source: 'تثبيت المصدر', generate: 'ترجمة جزء', check_unit: 'فحص الجزء', residue: 'إصلاح المقاطع', review: 'مراجعة الجودة', quality: 'فحص الفصل', extract: 'استخراج المصطلحات', glossary_commit: 'حفظ المصطلحات', publish: 'تجهيز النشر', verify: 'تأكيد الحفظ', done: 'مكتمل' };
const errors: Record<string, string> = { source_missing: 'لم يُعثر على النص الأصلي؛ بقي الفصل محفوظًا في قائمة العمل.', budget_approval_required: 'اختبار المزود يحتاج تحديد ميزانية أو تأكيد حصته المجانية.', provider_credential_missing: 'بيانات اتصال المزود غير متاحة.', provider_settings_changed: 'تغيرت إعدادات المزود أثناء المهمة.', ambiguous_retry_exhausted: 'تعذر تأكيد رد المزود بعد إعادة واحدة؛ يلزم التحقق قبل طلب جديد.', translation_quality_failed: 'لم يجتز الجزء فحص الجودة.', chapter_quality_failed: 'لم يجتز الفصل فحص الجودة.', glossary_quality_failed: 'لم تُعتمد نتيجة استخراج المصطلحات.', firestore_not_configured: 'مخزن الفصول غير متاح حاليًا.', publication_too_large: 'حجم النص يتجاوز حد النشر المدعوم؛ لم يُحذف المحتوى.' };
function errorText(code?: string) { return code ? errors[code] || 'تعذر استكمال المرحلة الحالية. راجع إعدادات المهمة والمحاولة التالية.' : ''; }
export default function AutomationPage() {
  const enabled = import.meta.env.VITE_DURABLE_JOBS === 'true';
  const [jobs, setJobs] = useState<AutomationJob[]>([]), [selected, setSelected] = useState<AutomationJob | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]), [novels, setNovels] = useState<{ _id: string; title: string }[]>([]);
  const [form, setForm] = useState<JobInput>({ kind: 'scrape', sourceUrl: '', startChapter: 1, endChapter: 1 });
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [noMoreJobs, setNoMoreJobs] = useState(false);
  const chapterCursor = pageCursors.at(-1);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const requestKey = useRef<string | null>(null), selectedId = selected?.id;
  useEffect(() => {
    if (!enabled) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const list = await automationService.list();
        if (!disposed) setJobs(previous => previous.length > 50 ? [...list, ...previous.filter(p => !list.some(j => j.id === p.id))] : list);
        if (selectedId) {
          const [job, rows] = await Promise.all([automationService.get(selectedId), automationService.chapters(selectedId, chapterCursor)]);
          if (!disposed) { setSelected(job); setChapters(rows); }
        }
      } catch { if (!disposed) setError('تعذر تحديث التقدم. تبقى المهمة محفوظة على الخادم.'); }
      finally { if (!disposed) timer = setTimeout(refresh, document.hidden ? 15000 : 5000); }
    };
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, [enabled, selectedId, chapterCursor]);
  useEffect(() => {
    if (!enabled || form.kind === 'scrape') return;
    let active = true;
    translatorService.getTranslatorNovels('', 1, 100).then(rows => { if (active) setNovels(rows); }).catch(() => { if (active) setError('تعذر تحميل قائمة الروايات.'); });
    return () => { active = false; };
  }, [enabled, form.kind]);
  const change = (patch: Partial<JobInput>) => { requestKey.current = null; setForm(value => ({ ...value, ...patch })); };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    requestKey.current ||= crypto.randomUUID();
    try {
      const job = await automationService.create(form, requestKey.current);
      setPageCursors([undefined]); setSelected(job); setJobs(list => [job, ...list.filter(j => j.id !== job.id)]);
      requestKey.current = null; setNotice('حُفظت المهمة على الخادم. يمكنك إغلاق الصفحة ومراجعة التقدم لاحقًا.');
    } catch { setError('لم يتأكد إنشاء المهمة. يمكنك إعادة المحاولة؛ سيُستخدم طلب الإنشاء نفسه لمنع الازدواج.'); }
    finally { setBusy(false); }
  }
  async function control(action: 'pause' | 'resume' | 'cancel') {
    if (!selected) return;
    if (action === 'cancel' && !window.confirm('إلغاء بقية المهمة؟ ستبقى النتائج المكتملة محفوظة.')) return;
    setBusy(true); setError('');
    try { const job = await automationService.control(selected.id, action); setSelected(job); setJobs(list => list.map(j => j.id === job.id ? job : j)); }
    catch { setError('تعذر تأكيد تغيير الحالة. حدّث التقدم قبل إعادة المحاولة.'); }
    finally { setBusy(false); }
  }
  if (!enabled) return <p dir="rtl">صفحة المهام ستتاح بعد اعتماد المحرك وإعداد بيئة التشغيل.</p>;
  return <div dir="rtl" className="space-y-6">
    <PageHead title="مهام ZEUS" desc="تابع الفصول التي تأكد حفظها، وأوقف العمل أو استأنفه من هنا." />
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {notice && <p role="status" className="text-green-300">{notice}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/15 p-4">
      <label>نوع المهمة<select className={inputCls} value={form.kind} onChange={e => change({ kind: e.target.value as JobKind })}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {form.kind === 'scrape' ? <label>رابط الرواية<input required type="url" className={inputCls} value={form.sourceUrl} onChange={e => change({ sourceUrl: e.target.value })} /></label> :
        <label>الرواية<select required className={inputCls} value={form.novelId || ''} onChange={e => change({ novelId: e.target.value })}><option value="">اختر رواية</option>{novels.map(n => <option key={n._id} value={n._id}>{n.title}</option>)}</select></label>}
      <div className="flex gap-3"><label>من الفصل<input required type="number" min="1" className={inputCls} value={form.startChapter} onChange={e => change({ startChapter: Number(e.target.value) })} /></label><label>إلى الفصل<input required type="number" min={form.startChapter} max={form.startChapter + 1999} className={inputCls} value={form.endChapter} onChange={e => change({ endChapter: Number(e.target.value) })} /></label></div>
      {form.kind !== 'scrape' && <label className="flex gap-2"><input type="checkbox" checked={form.sourceSelection === 'current_content'} onChange={e => change({ sourceSelection: e.target.checked ? 'current_content' : 'verified_original' })} />للروايات القديمة: استخدم النص الحالي مصدرًا واحفظ نسخة منه لهذه المهمة</label>}
      <button className={btnPrimary} disabled={busy}>إنشاء مهمة</button>
    </form>
    <ul className="space-y-2" aria-label="قائمة المهام">{jobs.map(j => <li key={j.id}><button className={btnGhost + ' w-full justify-between'} onClick={() => { setPageCursors([undefined]); setChapters([]); setSelected(j); }}><span>{j.title ? `${j.title} — ` : ''}{kinds[j.kind]} — {jobLabels[j.status] || j.status}</span><span>{j.completed} / {j.total}</span></button></li>)}</ul>
    {jobs.length >= 50 && !noMoreJobs && <button className={btnGhost} onClick={async () => { try { const rows = await automationService.list(jobs.at(-1)?.id); setJobs(all => [...all, ...rows.filter(r => !all.some(j => j.id === r.id))]); setNoMoreJobs(rows.length < 50); } catch { setError('تعذر تحميل المهام الأقدم.'); } }}>مهام أقدم</button>}
    {!jobs.length && <p>لا توجد مهام معروضة.</p>}
    {selected && <section aria-label="تفاصيل المهمة" className="space-y-3 rounded-xl border border-white/15 p-4">
      <h2 className="font-bold">{selected.title ? `${selected.title} — ` : ''}{kinds[selected.kind]} — {jobLabels[selected.status] || selected.status}</h2>
      <progress className="w-full" max={selected.total || 1} value={selected.completed} aria-label="الفصول المكتملة" />
      <p>حُفظ {selected.completed} من {selected.total} فصلًا — المتبقي {selected.remaining}</p>
      {selected.workerClass === 'long' && selected.status === 'queued' && <p>بانتظار تشغيل عامل الدفعات. التقدم السابق محفوظ.</p>}
      <p>الفصل الجاري: {selected.currentChapter || '—'} — {stages[selected.stage || ''] || 'في الانتظار'}</p>
      <p>إعادات المحاولة: {selected.retries || 0} — المعدل: {(selected.ratePerMinute || 0).toFixed(2)} فصل/دقيقة</p>
      {selected.nextRunAt && selected.status === 'retry_wait' && <p>المحاولة التالية: {new Date(selected.nextRunAt).toLocaleString('ar')}</p>}
      {(selected.blockedCode || selected.lastError) && <p role="status">{errorText(selected.blockedCode || selected.lastError)}</p>}
      <div className="flex flex-wrap gap-2">
        {['queued', 'running', 'retry_wait'].includes(selected.status) && <button disabled={busy} className={btnGhost} onClick={() => void control('pause')}>إيقاف مؤقت</button>}
        {['paused', 'blocked', 'failed'].includes(selected.status) && <button disabled={busy} className={btnPrimary} onClick={() => void control('resume')}>استئناف</button>}
        {!['completed', 'cancelled'].includes(selected.status) && <button disabled={busy} className={btnGhost} onClick={() => void control('cancel')}>إلغاء الباقي</button>}
      </div>
      <ul aria-label="الفصول">{chapters.map(c => <li key={c._id}>الفصل {c.number}: {c.state === 'verified' ? 'مكتمل ومحفوظ' : stages[c.stage] || 'في الانتظار'}{c.units > 0 && c.state !== 'verified' ? ` — ${selected.kind === 'glossary_extract' ? c.extractionUnit || 0 : c.unit}/${c.units} أجزاء ${selected.kind === 'glossary_extract' ? 'مستخرجة' : 'مترجمة'}` : ''}</li>)}</ul>
      <div className="flex gap-2">{pageCursors.length > 1 && <button className={btnGhost} onClick={() => setPageCursors(all => all.slice(0, -1))}>الفصول السابقة</button>}{chapters.length === 100 && <button className={btnGhost} onClick={() => setPageCursors(all => [...all, chapters.at(-1)?._id])}>الفصول التالية</button>}</div>
    </section>}
  </div>;
}
