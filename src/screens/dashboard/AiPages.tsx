/**
 * صفحات الذكاء الاصطناعي (قسم الإدارة):
 * وظائف الترجمة الآلية (قائمة + تفاصيل حية) / إعدادات المزودين /
 * ترجمة بيانات الروايات / توليد عناوين الفصول / إصلاح عناوين الفصول.
 * كل وظيفة واجهة مستقلة كاملة كما في التطبيق.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play, Pause, Trash2, RefreshCcw, Plus, ArrowRight, KeyRound, Sparkles,
  Check, X, Bot, Save, Wand2, ListTree, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { translatorService } from '../../services/translator';
import {
  inputCls, btnPrimary, btnGhost, Spinner, NovelPicker, PageHead, jobStatus, Modal,
} from './shared';

const STATUS_POLL_MS = 4000;

/* ═══════════ 1. وظائف الترجمة الآلية — القائمة ═══════════ */
export function TranslationJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await translatorService.getJobs()); }
    catch { toast.error('فشل جلب الوظائف'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // تحديث حي أثناء وجود وظائف قيد التنفيذ
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'active')) return;
    const t = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [jobs, load]);

  return (
    <div>
      <PageHead title="وظائف الترجمة الآلية" desc="مهام ترجمة الفصول بالذكاء الاصطناعي — اضغط وظيفة لمتابعتها حية والتحكم بها">
        <button onClick={load} className={btnGhost}><RefreshCcw size={15} /> تحديث</button>
      </PageHead>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="py-20 text-center">
          <Bot size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-1">لا توجد وظائف ترجمة بعد</p>
          <p className="text-white/30 text-xs mb-5">ابدأ وظيفة من «ترجمة بيانات الروايات» أو عبر بدء ترجمة فصول لرواية موجودة</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((j) => {
            const st = jobStatus(j.status);
            const pct = j.total ? Math.round(((j.translated || 0) / j.total) * 100) : 0;
            return (
              <button
                key={j.id}
                onClick={() => navigate(`/dashboard/translation-jobs/${j.id}`)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-right hover:border-white/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {j.cover && <img src={j.cover} alt="" className="w-11 h-16 rounded-lg object-cover bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm line-clamp-1">{j.novelTitle || 'وظيفة'}</h3>
                    <span className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 ${st.cls}`}>{st.label}</span>
                    <p className="text-white/40 text-xs mt-2">{j.translated || 0} / {j.total || 0} فصل ({pct}%)</p>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 2. تفاصيل وظيفة ترجمة — سجل حي وتحكم ═══════════ */
export function TranslationJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try { setJob(await translatorService.getJob(jobId)); }
    catch { /* الوظيفة قد تُحذف — نتجاهل التحديث */ }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!job || job.status !== 'active') return;
    const t = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [job, load]);
  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight });
  }, [job?.logs?.length]);

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;
  if (!job) return <div className="py-20 text-center text-white/50">الوظيفة غير موجودة — ربما حُذفت</div>;

  const st = jobStatus(job.status);
  const pct = job.totalToTranslate ? Math.round(((job.translatedCount || 0) / job.totalToTranslate) * 100) : 0;
  const logs = job.logs || [];

  const act = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); load(); }
    catch (e: any) { toast.error(e?.message || 'فشل الإجراء'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title={`وظيفة ترجمة — ${job.novelTitle || ''}`} desc={`${job.translatedCount || 0} / ${job.totalToTranslate || 0} فصل`}>
        <button onClick={() => navigate('/dashboard/translation-jobs')} className={btnGhost}><ArrowRight size={15} /> كل الوظائف</button>
      </PageHead>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`text-xs font-bold rounded-full px-3 py-1 ${st.cls}`}>{st.label}</span>
          <div className="flex-1 min-w-[180px]">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-white text-sm font-extrabold">{pct}%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status === 'active' ? (
            <button onClick={() => act(() => translatorService.pauseJob(jobId!), 'إيقاف مؤقت')} disabled={busy} className={btnGhost}><Pause size={15} /> إيقاف مؤقت</button>
          ) : job.status !== 'completed' ? (
            <button onClick={() => act(() => translatorService.start({ jobId }), 'استئناف الوظيفة')} disabled={busy} className={btnPrimary}><Play size={15} /> استئناف</button>
          ) : null}
          <button
            onClick={() => { if (window.confirm('حذف الوظيفة نهائياً؟ سجلها سيضيع.')) act(() => translatorService.deleteJob(jobId!), 'حُذفت الوظيفة').then(() => navigate('/dashboard/translation-jobs')); }}
            disabled={busy}
            className="bg-red-500/15 text-red-300 font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-red-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={15} /> حذف الوظيفة
          </button>
          <button onClick={load} className={btnGhost}><RefreshCcw size={15} /> تحديث الآن</button>
        </div>
      </div>

      {/* السجل الحي */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h4 className="text-white font-bold text-sm flex items-center gap-2"><Sparkles size={15} /> سجل التنفيذ الحي</h4>
          {job.status === 'active' && <span className="text-[10px] text-green-400 font-bold animate-pulse">● مباشر</span>}
        </div>
        <div ref={logsRef} className="max-h-[55vh] overflow-y-auto divide-y divide-white/5">
          {logs.length === 0 ? (
            <p className="py-10 text-center text-white/40 text-sm">لا سجلات بعد</p>
          ) : logs.slice().reverse().map((l: any, i: number) => (
            <div key={i} className="px-4 py-2.5 flex items-start gap-3">
              <span className="text-white/30 text-[10px] shrink-0 mt-0.5" dir="ltr">{l.time ? new Date(l.time).toLocaleTimeString('ar-EG') : ''}</span>
              <span className="text-white/75 text-sm flex-1">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 3. إعدادات الذكاء الاصطناعي (المزودون) ═══════════ */
const PROVIDER_PRESETS = [
  { id: 'gemini', name: 'Gemini API' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'deepseek', name: 'DeepSeek (تطبيق)' },
  { id: 'qwen', name: 'Qwen (تطبيق)' },
  { id: 'custom', name: 'مزود مخصص (OpenAI-compatible)' },
];

export function TranslationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [extractPrompt, setExtractPrompt] = useState('');
  const [translatorModel, setTranslatorModel] = useState('');
  const [legacyKeys, setLegacyKeys] = useState('');
  const [providers, setProviders] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await translatorService.getSettings();
      setCustomPrompt(s.customPrompt || '');
      setExtractPrompt(s.translatorExtractPrompt || '');
      setTranslatorModel(s.translatorModel || '');
      setLegacyKeys((s.translatorApiKeys || []).join('\n'));
      setProviders(s.translationProviders || []);
    } catch { toast.error('فشل جلب الإعدادات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await translatorService.saveSettings({
        customPrompt,
        translatorExtractPrompt: extractPrompt,
        translatorModel: translatorModel.trim(),
        translatorApiKeys: legacyKeys.split('\n').map((k) => k.trim()).filter(Boolean),
        translationProviders: providers,
      });
      toast.success('حُفظت الإعدادات');
    } catch (e: any) { toast.error(e?.message || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const addProvider = () => {
    setProviders((p) => [...p, {
      providerId: `provider_${Date.now()}`,
      name: 'مزوّد جديد',
      baseUrl: '',
      models: [],
      apiKeys: [],
      selectedModel: '',
      priority: p.length,
      thinkingEnabled: false,
      searchEnabled: true,
      deepSeekModelType: 'default',
      deepSeekTokens: [],
      qwenTokens: [],
    }]);
  };

  const patchProvider = (idx: number, patch: any) => {
    setProviders((p) => p.map((pr, i) => (i === idx ? { ...pr, ...patch } : pr)));
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div>
      <PageHead title="إعدادات الذكاء الاصطناعي" desc="المزودون والمفاتيح والنموذج وبرومبت الترجمة — نفس محرك التطبيق">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? <Spinner /> : <Save size={15} />} حفظ الكل</button>
      </PageHead>

      <div className="space-y-5 max-w-3xl">
        {/* النموذج العام */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm flex items-center gap-2"><Bot size={15} /> الإعدادات العامة</h3>
          <div>
            <label className="text-white/50 text-xs">النموذج الافتراضي للترجمة</label>
            <input className={inputCls + ' mt-1'} placeholder="gemini-2.5-flash" value={translatorModel} onChange={(e) => setTranslatorModel(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="text-white/50 text-xs">برومبت الترجمة المخصص (يُلحق بنظام الترجمة)</label>
            <textarea className={inputCls + ' mt-1 font-mono text-xs'} rows={4} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} dir="auto" />
          </div>
          <div>
            <label className="text-white/50 text-xs">برومبت استخراج قائمة الفصول</label>
            <textarea className={inputCls + ' mt-1 font-mono text-xs'} rows={4} value={extractPrompt} onChange={(e) => setExtractPrompt(e.target.value)} dir="auto" />
          </div>
          <div>
            <label className="text-white/50 text-xs">مفاتيح قديمة (سطر لكل مفتاح — تُستخدم إن لم يوجد مزودون)</label>
            <textarea className={inputCls + ' mt-1 font-mono text-xs'} rows={3} value={legacyKeys} onChange={(e) => setLegacyKeys(e.target.value)} dir="ltr" />
          </div>
        </div>

        {/* المزودون */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2"><KeyRound size={15} /> مزودو الترجمة ({providers.length})</h3>
          <button onClick={addProvider} className={btnGhost}><Plus size={15} /> إضافة مزود</button>
        </div>

        {providers.map((p, idx) => (
          <ProviderCard key={p.providerId || idx} p={p} idx={idx} onChange={(patch) => patchProvider(idx, patch)} onDelete={() => setProviders((prev) => prev.filter((_, i) => i !== idx))} />
        ))}

        <button onClick={save} disabled={saving} className={btnPrimary + ' w-full'}>
          {saving ? <Spinner /> : <Save size={16} />} حفظ كل الإعدادات
        </button>
      </div>
    </div>
  );
}

function ProviderCard({ p, idx, onChange, onDelete }: { p: any; idx: number; onChange: (patch: any) => void; onDelete: () => void }) {
  const [keysText, setKeysText] = useState((p.apiKeys || []).join('\n'));
  const [models, setModels] = useState<any[]>(p.models || []);
  const [newModel, setNewModel] = useState('');
  const [fetching, setFetching] = useState(false);
  const isDeepSeek = p.providerId === 'deepseek' || String(p.providerId).startsWith('deepseek_');
  const isQwen = p.providerId === 'qwen' || String(p.providerId).startsWith('qwen_');

  useEffect(() => { setKeysText((p.apiKeys || []).join('\n')); }, [p.apiKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitKeys = () => {
    const keys = keysText.split('\n').map((k) => k.trim()).filter(Boolean);
    onChange(isDeepSeek ? { apiKeys: keys, deepSeekTokens: keys } : isQwen ? { apiKeys: keys, qwenTokens: keys } : { apiKeys: keys });
  };

  const fetchModels = async () => {
    if (!p.baseUrl?.trim()) { toast.error('أدخل Base URL أولاً'); return; }
    setFetching(true);
    try {
      const res = await translatorService.fetchProviderModels(p.baseUrl, (p.apiKeys || [])[0] || '');
      const mapped = res.map((m: any) => ({ modelId: m.id || m.modelId || String(m), modelName: m.name || m.modelName || m.id || String(m) }));
      setModels(mapped);
      onChange({ models: mapped });
      toast.success(`عُثر على ${mapped.length} نموذجاً`);
    } catch { toast.error('فشل جلب النماذج — تحقق من الرابط والمفتاح'); }
    finally { setFetching(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <input className={inputCls + ' flex-1'} value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="اسم المزود" />
        <select
          className={inputCls + ' w-auto'}
          value={PROVIDER_PRESETS.some((pr) => pr.id === p.providerId) ? p.providerId : 'custom'}
          onChange={(e) => onChange({ providerId: e.target.value })}
        >
          {PROVIDER_PRESETS.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
        </select>
        <button onClick={onDelete} className="p-2.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25" aria-label="حذف المزود"><Trash2 size={15} /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs">Base URL (للمزود المخصص)</label>
          <input className={inputCls + ' mt-1'} value={p.baseUrl || ''} onChange={(e) => onChange({ baseUrl: e.target.value })} placeholder="https://api.example.com/v1" dir="ltr" disabled={isDeepSeek || isQwen} />
        </div>
        <div>
          <label className="text-white/50 text-xs">النموذج المختار</label>
          <input className={inputCls + ' mt-1'} value={p.selectedModel || ''} onChange={(e) => onChange({ selectedModel: e.target.value })} placeholder="model-id" dir="ltr" list={`models-${idx}`} />
          <datalist id={`models-${idx}`}>
            {models.map((m) => <option key={m.modelId} value={m.modelId}>{m.modelName}</option>)}
          </datalist>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-white/50 text-xs">المفاتيح / التوكنات (سطر لكل مفتاح)</label>
          <button onClick={commitKeys} className="text-[11px] text-white/60 hover:text-white font-bold">تثبيت المفاتيح ✓</button>
        </div>
        <textarea className={inputCls + ' mt-1 font-mono text-xs'} rows={3} value={keysText} onChange={(e) => setKeysText(e.target.value)} onBlur={commitKeys} dir="ltr" />
      </div>

      {!isDeepSeek && !isQwen && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-white/50 text-xs">النماذج ({models.length}) — جلب تلقائي من Base URL</label>
          </div>
          <button onClick={fetchModels} disabled={fetching} className={btnGhost}>
            {fetching ? <Spinner /> : <RefreshCcw size={14} />} جلب النماذج
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2 text-white/60 cursor-pointer">
          <input type="checkbox" checked={!!p.thinkingEnabled} onChange={(e) => onChange({ thinkingEnabled: e.target.checked })} className="accent-white" />
          التفكير المطوّل (thinking)
        </label>
        <label className="flex items-center gap-2 text-white/60 cursor-pointer">
          <input type="checkbox" checked={p.searchEnabled !== false} onChange={(e) => onChange({ searchEnabled: e.target.checked })} className="accent-white" />
          البحث المفعّل
        </label>
        <label className="flex items-center gap-2 text-white/60">
          الأولوية
          <input type="number" className="w-16 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs" value={p.priority ?? 0} onChange={(e) => onChange({ priority: parseInt(e.target.value) || 0 })} />
        </label>
      </div>
    </div>
  );
}

/* ═══════════ 4. ترجمة بيانات الروايات ═══════════ */
export function MetadataTranslationPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setJobs(await translatorService.getMetadataJobs()); }
    catch { toast.error('فشل جلب الوظائف'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'active')) return;
    const t = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [jobs, load]);

  const start = async (novel: any) => {
    setStarting(novel._id);
    try {
      await translatorService.startMetadataTranslation(novel._id);
      toast.success(`بدأت ترجمة بيانات «${novel.title}»`);
      load();
    } catch (e: any) { toast.error(e?.message || 'فشل البدء'); }
    finally { setStarting(null); }
  };

  return (
    <div>
      <PageHead title="ترجمة بيانات الروايات" desc="ترجمة العنوان والوصف والوسوم والتصنيف بالذكاء الاصطناعي — اختر رواية لبدء المهمة" />
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Sparkles size={15} /> بدء مهمة جديدة</h3>
        <NovelPicker adminOnly actionLabel={starting ? '…' : 'ترجمة البيانات'} onPick={starting ? () => {} : start} />
      </div>

      <h3 className="text-white font-bold text-sm mb-3">المهام ({jobs.length})</h3>
      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="py-10 text-center text-white/40 text-sm">لا مهام بعد</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const st = jobStatus(j.status);
            const pct = j.totalSteps ? Math.round(((j.processedCount || 0) / j.totalSteps) * 100) : 0;
            return (
              <div key={j._id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-3">
                {j.cover && <img src={j.cover} alt="" className="w-10 h-14 rounded-lg object-cover bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />}
                <div className="flex-1 min-w-[160px]">
                  <h4 className="text-white font-bold text-sm truncate">{j.novelTitle || '—'}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                    <span className="text-white/40 text-[11px]">{j.processedCount || 0}/{j.totalSteps || 3} خطوة</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  onClick={async () => { if (!window.confirm('حذف المهمة؟')) return; try { await translatorService.deleteMetadataJob(j._id); toast.success('حُذفت'); load(); } catch { toast.error('فشل الحذف'); } }}
                  className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25" aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 5. توليد عناوين الفصول ═══════════ */
export function TitleGenPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);

  const load = useCallback(async () => {
    try { setJobs(await translatorService.getTitleGenJobs()); }
    catch { toast.error('فشل جلب الوظائف'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'active')) return;
    const t = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [jobs, load]);

  return (
    <div>
      <PageHead title="توليد عناوين الفصول" desc="توليد عناوين ذكية لفصول الروايات بالذكاء الاصطناعي">
        <button onClick={() => setShowStart(true)} className={btnPrimary}><Plus size={15} /> مهمة جديدة</button>
      </PageHead>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <Wand2 size={38} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">لا مهام بعد — اضغط «مهمة جديدة» واختر رواية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => <JobRow key={j.id || j._id} j={j} kind="titlegen" onRefresh={load} />)}
        </div>
      )}

      {showStart && <TitleGenStartModal onClose={() => setShowStart(false)} onStarted={load} />}
    </div>
  );
}

function TitleGenStartModal({ onClose, onStarted }: { onClose: () => void; onStarted: () => void }) {
  const [novel, setNovel] = useState<any>(null);
  const [mode, setMode] = useState<'all' | 'custom'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!novel) { toast.error('اختر رواية أولاً'); return; }
    setBusy(true);
    try {
      const chapters = mode === 'all' ? 'all' : Array.from({ length: Math.max(1, parseInt(to) - parseInt(from) + 1) }, (_, i) => parseInt(from) + i).filter((n) => !Number.isNaN(n));
      const res = await translatorService.startTitleGen({ novelId: novel._id, chapters });
      toast.success(`بدأت المهمة (${res?.jobId ? 'رقم ' + String(res.jobId).slice(-6) : ''})`);
      onStarted();
      onClose();
    } catch (e: any) { toast.error(e?.message || 'فشل البدء'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="مهمة توليد عناوين جديدة" onClose={onClose} wide>
      {!novel ? (
        <div className="max-h-[65vh] overflow-y-auto">
          <NovelPicker actionLabel="اختيار" onPick={setNovel} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-white/80 text-sm font-bold">الرواية: {novel.title} ({novel.chaptersCount ?? 0} فصل)</p>
          <div className="flex gap-2">
            <button onClick={() => setMode('all')} className={mode === 'all' ? btnPrimary : btnGhost}>كل الفصول</button>
            <button onClick={() => setMode('custom')} className={mode === 'custom' ? btnPrimary : btnGhost}>نطاق مخصص</button>
          </div>
          {mode === 'custom' && (
            <div className="flex gap-2 items-center">
              <input type="number" className={inputCls} placeholder="من فصل" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-white/40">إلى</span>
              <input type="number" className={inputCls} placeholder="إلى فصل" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}
          <button onClick={start} disabled={busy} className={btnPrimary + ' w-full'}>
            {busy ? <Spinner /> : <Play size={15} />} بدء المهمة
          </button>
        </div>
      )}
    </Modal>
  );
}

/* صف وظيفة موحد (عرض + تحكم + سجل قابل للفتح) */
function JobRow({ j, kind, onRefresh }: { j: any; kind: 'titlegen' | 'extract'; onRefresh: () => void }) {
  const id = j.id || j._id;
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const st = jobStatus(j.status);
  const total = j.totalToProcess ?? j.totalChapters ?? j.totalToTranslate ?? 0;
  const done = j.processedCount ?? j.translatedCount ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const loadDetail = async () => {
    if (detail) { setOpen(!open); return; }
    try {
      const d = kind === 'titlegen' ? await translatorService.getTitleGenJob(id) : await translatorService.getExtractJob(id);
      setDetail(d);
      setOpen(true);
    } catch { toast.error('فشل جلب التفاصيل'); }
  };

  const act = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); onRefresh(); loadDetail(); }
    catch (e: any) { toast.error(e?.message || 'فشل'); }
    finally { setBusy(false); }
  };

  const svc = kind === 'titlegen'
    ? { pause: () => translatorService.pauseTitleGen(id), resume: () => translatorService.startTitleGen({ jobId: id }), del: () => translatorService.deleteTitleGenJob(id) }
    : { pause: null, resume: null, del: () => translatorService.deleteExtractJob(id) };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button onClick={loadDetail} className="w-full p-4 flex flex-wrap items-center gap-3 text-right hover:bg-white/5">
        {j.cover && <img src={j.cover} alt="" className="w-10 h-14 rounded-lg object-cover bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />}
        <div className="flex-1 min-w-[160px]">
          <h4 className="text-white font-bold text-sm truncate">{j.novelTitle || 'وظيفة'}</h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
            <span className="text-white/40 text-[11px]">{done}/{total}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-white/30 text-xs">{open ? '▲ إخفاء السجل' : '▼ عرض السجل'}</span>
      </button>

      {open && detail && (
        <div className="border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {svc.pause && detail.status === 'active' && (
              <button onClick={() => act(svc.pause, 'إيقاف مؤقت')} disabled={busy} className={btnGhost}><Pause size={14} /> إيقاف</button>
            )}
            {svc.resume && detail.status !== 'active' && detail.status !== 'completed' && (
              <button onClick={() => act(svc.resume, 'استئناف')} disabled={busy} className={btnPrimary}><Play size={14} /> استئناف</button>
            )}
            <button
              onClick={() => { if (window.confirm('حذف الوظيفة؟')) act(svc.del, 'حُذفت').then(onRefresh); }}
              disabled={busy}
              className="bg-red-500/15 text-red-300 font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-red-500/25 flex items-center gap-2"
            >
              <Trash2 size={14} /> حذف
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-white/5 bg-black/30 rounded-xl border border-white/10">
            {(detail.logs || []).slice().reverse().map((l: any, i: number) => (
              <div key={i} className="px-3 py-2 text-white/70 text-xs">{l.message}</div>
            ))}
            {(detail.logs || []).length === 0 && <p className="py-6 text-center text-white/40 text-xs">لا سجلات</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ 6. إصلاح عناوين الفصول (استخراج العناوين) ═══════════ */
export function TitleFixerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);

  const load = useCallback(async () => {
    try { setJobs(await translatorService.getExtractJobs()); }
    catch { toast.error('فشل جلب الوظائف'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'active')) return;
    const t = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [jobs, load]);

  return (
    <div>
      <PageHead title="إصلاح عناوين الفصول" desc="استخراج العناوين الحقيقية من نصوص الفصول وإصلاح العناوين المكسورة/الرقمية">
        <button onClick={() => setShowStart(true)} className={btnPrimary}><Plus size={15} /> مهمة جديدة</button>
      </PageHead>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <ListTree size={38} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">لا مهام بعد — اختر رواية لبدء استخراج العناوين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => <JobRow key={j._id} j={j} kind="extract" onRefresh={load} />)}
        </div>
      )}

      {showStart && (
        <Modal title="مهمة إصلاح عناوين جديدة" onClose={() => setShowStart(false)} wide>
          <div className="max-h-[65vh] overflow-y-auto">
            <PageHeadInline />
            <NovelPicker
              adminOnly
              actionLabel="بدء الاستخراج"
              onPick={async (n) => {
                try {
                  await translatorService.startExtract(n._id);
                  toast.success(`بدأت مهمة استخراج العناوين لـ«${n.title}»`);
                  setShowStart(false);
                  load();
                } catch (e: any) { toast.error(e?.message || 'فشل البدء'); }
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
function PageHeadInline() {
  return (
    <p className="text-white/50 text-xs mb-3 flex items-center gap-2"><FileText size={13} /> اختر الرواية المراد إصلاح عناوين فصولها:</p>
  );
}
