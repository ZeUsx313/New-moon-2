/**
 * صفحات قسم الإدارة:
 * المستخدمون / التصنيفات / السجلات / التحليلات / الأمان /
 * المنظف والاستبدال / إشعارات الحقوق / مفاتيح السكرابر / الاستيراد التلقائي.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users as UsersIcon, Plus, X, RefreshCcw, ShieldAlert, Eraser, Copyright,
  KeyRound, DownloadCloud, Play, Trash2, Save, Search, Loader2, Cookie, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService, AdminUser, ScraperLog } from '../../services/admin';
import { categoryService } from '../../services/category';
import { translatorService } from '../../services/translator';
import { inputCls, btnPrimary, btnGhost, Spinner, PageHead, jobStatus } from './shared';

/* ═══════════ المستخدمون والأدوار ═══════════ */
export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminService.getUsers()); }
    catch { toast.error('فشل جلب المستخدمين'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (user: AdminUser, role: string) => {
    try {
      await adminService.setUserRole(user._id, role);
      toast.success(`تم جعل ${user.name} ${role === 'admin' ? 'مشرفاً' : role === 'contributor' ? 'مترجماً' : 'قارئاً'}`);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: role as AdminUser['role'] } : u)));
    } catch { toast.error('فشل تغيير الدور'); }
  };

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHead title="المستخدمون والأدوار" desc={`${users.length} مستخدماً — ترقية إلى مترجم أو مشرف`}>
        <button onClick={load} className={btnGhost}><RefreshCcw size={15} /> تحديث</button>
      </PageHead>

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className={inputCls + ' pr-9'} placeholder="ابحث بالاسم أو البريد…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[65vh] overflow-y-auto">
            {filtered.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{u.name}</p>
                  <p className="text-white/40 text-xs truncate" dir="ltr">{u.email}</p>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/15 outline-none"
                  aria-label={`دور ${u.name}`}
                >
                  <option value="user">قارئ</option>
                  <option value="contributor">مترجم</option>
                  <option value="admin">مشرف</option>
                </select>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-10 text-center text-white/40 text-sm">لا نتائج</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ التصنيفات ═══════════ */
export function CategoriesPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await categoryService.getCategories()); }
    catch { toast.error('فشل جلب التصنيفات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    try {
      await adminService.addCategory(name);
      setNewCat('');
      toast.success('أضيفت التصنيف');
      load();
    } catch { toast.error('فشل إضافة التصنيف'); }
  };

  const delCat = async (name: string) => {
    if (!window.confirm(`حذف تصنيف «${name}»؟`)) return;
    try {
      await adminService.deleteCategory(name);
      toast.success('حُذف التصنيف');
      load();
    } catch { toast.error('فشل الحذف'); }
  };

  return (
    <div>
      <PageHead title="التصنيفات" desc="تصنيفات الروايات الظاهرة في المكتبة ونموذج الإنشاء" />
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-2xl">
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="اسم تصنيف جديد"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCat()}
          />
          <button onClick={addCat} className={btnPrimary + ' shrink-0'}><Plus size={15} /> إضافة</button>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cats.filter((c) => c.id !== 'all').map((c) => (
              <span key={c.id} className="bg-white/10 text-white/80 text-sm rounded-full pl-2 pr-4 py-2 flex items-center gap-2">
                {c.name}
                <button onClick={() => delCat(c.name)} className="text-red-400 hover:text-red-300" aria-label={`حذف ${c.name}`}><X size={14} /></button>
              </span>
            ))}
            {cats.filter((c) => c.id !== 'all').length === 0 && <p className="text-white/40 text-sm py-4">لا تصنيفات بعد</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ السجلات ═══════════ */
export function LogsPage() {
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setLogs(await adminService.getLogs()); }
    catch { toast.error('فشل جلب السجلات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHead title="السجلات" desc="سجل نشاط السكرابر والإضافة والتعديل على الخادم">
        <button onClick={load} className={btnGhost}>{loading ? <Spinner /> : <RefreshCcw size={15} />} تحديث</button>
      </PageHead>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-white/40 text-sm">لا سجلات بعد</p>
          ) : logs.map((l) => (
            <div key={l._id} className="px-4 py-2.5 flex items-start gap-3">
              <span className="text-white/30 text-xs shrink-0" dir="ltr">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
              <span className="text-white/75 text-sm flex-1">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ التحليلات (منسوخة من اللوحة القديمة) ═══════════ */
export function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try { setData(await adminService.getAnalyticsSummary(d)); }
    catch { toast.error('فشل جلب التحليلات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(days); }, [days, load]);

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;
  if (!data) return <div className="py-20 text-center text-white/50">لا توجد بيانات بعد</div>;

  const series: { _id: string; views: number; visitors: number }[] = data.daily || [];
  const maxV = Math.max(1, ...series.map((d) => d.views));

  return (
    <div>
      <PageHead title="التحليلات" desc="إحصاءات الزيارات الحية من الخادم">
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {d} يوم
            </button>
          ))}
          <button onClick={() => load(days)} className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white" aria-label="تحديث"><RefreshCcw size={15} /></button>
        </div>
      </PageHead>

      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'مشاهدات الصفحات', value: data.totals?.pageViews ?? 0 },
            { label: 'زوار فريدون', value: data.totals?.uniqueVisitors ?? 0 },
            { label: 'جلسات', value: data.totals?.sessions ?? 0 },
            { label: 'روايات مقروءة', value: data.totals?.novelOpens ?? 0 },
          ].map((c) => (
            <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/50 text-xs">{c.label}</p>
              <p className="text-white text-2xl font-extrabold mt-1">{Number(c.value).toLocaleString('en-US')}</p>
            </div>
          ))}
        </div>

        {series.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h4 className="text-white font-bold mb-4">الزيارات اليومية</h4>
            <div className="flex items-end gap-1.5 h-40" dir="ltr">
              {series.slice().reverse().map((d) => (
                <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-white/0 group-hover:text-white/70 transition-colors">{d.views}</span>
                  <div className="w-full bg-white/20 hover:bg-white/40 rounded-t transition-colors" style={{ height: `${Math.max(3, (d.views / maxV) * 100)}%` }} />
                  <span className="text-[9px] text-white/40">{d._id.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'أكثر الصفحات زيارة', rows: (data.topPages || []).map((p: any) => ({ k: p._id, v: p.count })) },
            { title: 'أكثر الروايات قراءة', rows: (data.topNovels || []).map((p: any) => ({ k: p.title || p._id, v: p.count })) },
            { title: 'مصادر الزيارات', rows: (data.referrers || []).map((p: any) => ({ k: p._id || 'مباشر', v: p.count })) },
          ].map((box) => (
            <div key={box.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="text-white font-bold text-sm mb-3">{box.title}</h4>
              <div className="space-y-2">
                {box.rows.length === 0 && <p className="text-white/40 text-xs">لا بيانات بعد</p>}
                {box.rows.slice(0, 8).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-white/70 truncate" dir="auto">{r.k}</span>
                    <span className="text-white font-bold shrink-0">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(data.devices || []).length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white font-bold text-sm mb-3">الأجهزة</h4>
            <div className="flex flex-wrap gap-2">
              {data.devices.map((d: any) => (
                <span key={d._id} className="bg-white/10 text-white/80 text-xs rounded-full px-3 py-1.5">{d._id}: <b>{d.count}</b></span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ الأمان (منسوخة من اللوحة القديمة) ═══════════ */
export function SecurityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bans, stats] = await Promise.all([adminService.getSecurityBans(), adminService.getSecurityStats()]);
      setData({ bans: bans?.bans || [], stats });
    } catch { toast.error('فشل جلب حالة الأمان'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unban = async (ip: string) => {
    try {
      await adminService.unbanIp(ip);
      toast.success(`تم فك حظر ${ip}`);
      load();
    } catch { toast.error('فشل فك الحظر'); }
  };

  const unbanAll = async () => {
    try {
      const res = await adminService.unbanAllIps();
      toast.success(`تم فك حظر جميع العناوين (${res?.removed ?? 0}) ومسح عدادات المخالفات`);
      setConfirmAll(false);
      load();
    } catch { toast.error('فشل فك الحظر الجماعي'); }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div>
      <PageHead title="الأمان" desc="عناوين IP المحظورة وسياسة الحماية" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'IP محظور الآن', value: data?.stats?.bannedIps ?? data?.bans?.length ?? 0 },
            { label: 'طلبات آخر دقيقة', value: data?.stats?.requestsLastMinute ?? '—' },
            { label: 'عناوين نشطة', value: data?.stats?.trackedIps ?? '—' },
            { label: 'تحديات كابتشا', value: data?.stats?.captchaChallenges ?? '—' },
          ].map((c) => (
            <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/50 text-xs">{c.label}</p>
              <p className="text-white text-xl font-extrabold mt-1">{String(c.value)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><ShieldAlert size={15} /> سياسة الحماية الحالية</h4>
          <ol className="text-white/60 text-xs space-y-1.5 list-decimal ps-5 leading-relaxed">
            <li>تجاوز الحدود → <span className="text-white/85">تهدئة 429 مع مدة انتظار</span> — لا حظر أبداً في هذه المرحلة.</li>
            <li>إن ضُبطت الكابتشا → بوابة تحقق بشرية، وحلّها يمنح حرية قراءة 15 دقيقة.</li>
            <li>الحظر المؤقت (15د) <span className="text-white/85">آخر خيار إضطراري</span> — فقط لمن يتجاهل التهديدات 10+ مرة خلال 15 دقيقة، أو فخ السكرابر.</li>
            <li>المشرفون/المساهمون مستثنون تماماً، وتنزيل الفصول للقراءة دون إنترنت له ميزانية سخية مستقلة ولا يُحظر منها.</li>
          </ol>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
            <h4 className="text-white font-bold text-sm flex items-center gap-2"><ShieldAlert size={15} /> عناوين محظورة</h4>
            <div className="flex items-center gap-2">
              {(data?.bans || []).length > 0 && (
                confirmAll ? (
                  <>
                    <button onClick={unbanAll} className="bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-lg px-3 py-1.5">تأكيد فك الجميع</button>
                    <button onClick={() => setConfirmAll(false)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">إلغاء</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmAll(true)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">فك حظر الجميع</button>
                )
              )}
              <button onClick={load} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="تحديث"><RefreshCcw size={15} /></button>
            </div>
          </div>
          {(data?.bans || []).length === 0 ? (
            <p className="py-10 text-center text-white/40 text-sm">لا توجد حظرات حالياً — الأمن هادئ</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.bans.map((b: any) => (
                <div key={b.ip} className="flex items-center gap-3 px-4 py-3">
                  <span className="font-mono text-white text-sm" dir="ltr">{b.ip}</span>
                  <span className="text-white/40 text-xs flex-1 truncate">{b.reason} — حتى {new Date(b.until).toLocaleString('ar-EG')}</span>
                  <button onClick={() => unban(b.ip)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">فك الحظر</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ المنظف والاستبدال ═══════════ */
export function CleanerPage() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setWords(await translatorService.getCleanerWords()); }
    catch { toast.error('فشل جلب القائمة'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const w = newWord.trim();
    if (!w) return;
    setBusy(true);
    const t = toast.loading('جارٍ الإضافة وتنظيف كل الفصول…');
    try {
      await translatorService.addCleanerWord(w);
      toast.success('أُضيفت الكلمة ونُفذ التنظيف', { id: t });
      setNewWord('');
      load();
    } catch (e: any) { toast.error(e?.message || 'فشل التنفيذ', { id: t }); }
    finally { setBusy(false); }
  };

  const del = async (w: string) => {
    if (!window.confirm(`إزالة «${w}» من قائمة التنظيف؟`)) return;
    setBusy(true);
    const t = toast.loading('جارٍ الإزالة…');
    try {
      await translatorService.deleteCleanerWord(w);
      toast.success('أُزيلت', { id: t });
      load();
    } catch { toast.error('فشل الإزالة', { id: t }); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title="المنظف والاستبدال" desc="كلمات تُنزع تلقائياً من نص كل الفصول (علامات مائية، توقيعات مواقع…). الإضافة تنفذ تنظيفاً فورياً لكل المحتوى" />
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-2xl">
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="كلمة أو عبارة للتنظيف…"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            dir="auto"
          />
          <button onClick={add} disabled={busy} className={btnPrimary + ' shrink-0'}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Eraser size={15} />} إضافة وتنظيف
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((w, i) => (
              <span key={`${w}-${i}`} className="bg-white/10 text-white/80 text-xs rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1.5" dir="auto">
                {w}
                <button onClick={() => del(w)} className="text-red-400 hover:text-red-300" aria-label={`حذف ${w}`}><X size={13} /></button>
              </span>
            ))}
            {words.length === 0 && <p className="text-white/40 text-sm py-4">القائمة فارغة</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ إشعارات الحقوق ═══════════ */
export function CopyrightPage() {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    translatorService.getCopyright()
      .then(setForm)
      .catch(() => toast.error('فشل جلب إعدادات الحقوق'));
  }, []);

  if (!form) return <div className="py-24 flex justify-center"><Spinner /></div>;

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await translatorService.saveCopyright(form);
      toast.success('حُفظت إعدادات الحقوق');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHead title="إشعارات الحقوق" desc="نص يُحقن في بداية/نهاية كل فصل مع فاصل فصول — حماية تعريفية">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? <Spinner /> : <Save size={15} />} حفظ</button>
      </PageHead>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-2xl space-y-4">
        <div>
          <label className="text-white/50 text-xs">نص بداية الفصل</label>
          <textarea className={inputCls + ' mt-1'} rows={3} value={form.startText || ''} onChange={(e) => set('startText', e.target.value)} dir="auto" />
        </div>
        <div>
          <label className="text-white/50 text-xs">نص نهاية الفصل</label>
          <textarea className={inputCls + ' mt-1'} rows={3} value={form.endText || ''} onChange={(e) => set('endText', e.target.value)} dir="auto" />
        </div>
        <div>
          <label className="text-white/50 text-xs">فاصل الفصول (نص بين الفصول في التمرير المستمر)</label>
          <input className={inputCls + ' mt-1'} value={form.chapterSeparatorText || ''} onChange={(e) => set('chapterSeparatorText', e.target.value)} dir="auto" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-white/50 text-xs">تكرار الإشعار</label>
            <select className={inputCls + ' mt-1'} value={form.frequency || 'always'} onChange={(e) => set('frequency', e.target.value)}>
              <option value="always">كل فصل</option>
              <option value="everyX">كل X فصل</option>
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs">كل كم فصل (عند اختيار everyX)</label>
            <input type="number" min={1} className={inputCls + ' mt-1'} value={form.everyX || 5} onChange={(e) => set('everyX', parseInt(e.target.value) || 5)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
          <input type="checkbox" checked={form.enableChapterSeparator ?? true} onChange={(e) => set('enableChapterSeparator', e.target.checked)} className="accent-white" />
          تفعيل فاصل الفصول
        </label>
        <button onClick={save} disabled={saving} className={btnPrimary + ' w-full'}>
          {saving ? <Spinner /> : <Copyright size={16} />} حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}

/* ═══════════ مفاتيح السكرابر + كوكيز TomatoMTL (نفس واجهة التطبيق) ═══════════ */
const TOMATOMTL_EXAMPLE = 'مثال (ترويسة Cookie كاملة من المتصفح):\ncf_clearance=alvbHRPkSSaWrtoOVhRFGrz8P_tbInkp…; _ga=GA1.1.1632139315.1790935815; translator_button=en; remember_6TpGq1xR_F05q3tke-JkBw=wJwdY-taHOAxK15ymm9RarLW%7E5pnIX134L0vGDX5N3ROrYxcV_4xWJFLS; PHPSESSID=t349n0dhnsm74n6mqasln6rvne';

export function ScraperKeysPage() {
  const [keysText, setKeysText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statuses, setStatuses] = useState<any[] | null>(null);
  // 🍪 كوكيز TomatoMTL
  const [mtText, setMtText] = useState('');
  const [mtSaving, setMtSaving] = useState(false);
  const [mtChecking, setMtChecking] = useState(false);
  const [mtResult, setMtResult] = useState<{ ok?: boolean; message?: string } | null>(null);

  useEffect(() => {
    translatorService.getScraperKeys()
      .then((res) => {
        setKeysText((res.keys || []).join('\n'));
        setMtText(res.tomatomtlCookies || '');
      })
      .catch(() => toast.error('فشل جلب المفاتيح'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const keys = keysText.split('\n').map((k) => k.trim()).filter(Boolean);
    setSaving(true);
    try {
      await translatorService.saveScraperKeys(keys);
      toast.success('حُفظت المفاتيح ودُفعت للسكرابر');
    } catch (e: any) { toast.error(e?.message || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const check = async () => {
    setChecking(true);
    setStatuses(null);
    try {
      const res = await translatorService.checkScraperKeys();
      setStatuses(res.statuses || []);
    } catch { toast.error('فشل الفحص'); }
    finally { setChecking(false); }
  };

  // 🍪 حفظ كوكيز TomatoMTL (فارغ = إعادة للثابتة بالكود)
  const saveCookies = async () => {
    setMtSaving(true);
    try {
      const res = await translatorService.saveTomatomtlCookies(mtText.trim());
      toast.success(res?.tomatomtl?.cleared ? 'فُرِّغت الكوكيز — يعود السكرابر للثابتة بالكود' : 'حُفظت الكوكيز وأُرسلت للسكرابر');
    } catch (e: any) { toast.error(e?.message || 'فشل حفظ الكوكيز'); }
    finally { setMtSaving(false); }
  };

  // 🍪 فحص حي للجلسة عبر السكرابر
  const checkSession = async () => {
    setMtChecking(true);
    setMtResult(null);
    try {
      setMtResult(await translatorService.checkTomatomtlSession());
    } catch (e: any) { toast.error(e?.message || 'فشل الفحص'); }
    finally { setMtChecking(false); }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div>
      <PageHead title="مفاتيح السكرابر" desc="مفاتيح ScraperAPI وكوكيز TomatoMTL — نفس واجهة التطبيق">
        <button onClick={check} disabled={checking} className={btnGhost}>{checking ? <Spinner /> : <KeyRound size={15} />} فحص الأرصدة</button>
      </PageHead>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-2xl">
        <textarea className={inputCls + ' font-mono text-xs'} rows={8} value={keysText} onChange={(e) => setKeysText(e.target.value)} dir="ltr" placeholder="سكرابر مفتاح واحد في كل سطر" />
        <button onClick={save} disabled={saving} className={btnPrimary + ' w-full mt-3'}>
          {saving ? <Spinner /> : <Save size={15} />} حفظ المفاتيح
        </button>

        {statuses && (
          <div className="mt-4 space-y-2">
            <h4 className="text-white font-bold text-sm">نتائج الفحص</h4>
            {statuses.length === 0 && <p className="text-white/40 text-sm">لا مفاتيح محفوظة</p>}
            {statuses.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5">
                <span className="font-mono text-white/80 text-xs flex-1 truncate" dir="ltr">{s.key?.slice(0, 12) || `مفتاح ${i + 1}`}…</span>
                <span className={`text-xs font-bold ${s.valid ? 'text-green-400' : 'text-red-400'}`}>{s.valid ? 'صالح' : 'منتهي/خاطئ'}</span>
                {s.remaining !== undefined && <span className="text-white/50 text-xs">متبقٍ: {s.remaining}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🍪 كوكيز TomatoMTL — نفس نصوص وبنية واجهة التطبيق */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-2xl mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Cookie size={18} className="text-red-400" />
          <h3 className="text-white font-bold text-sm">كوكيز TomatoMTL — حساب القراءة</h3>
        </div>
        <p className="text-white/60 text-xs leading-6 whitespace-pre-line">
          {'موقع TomatoMTL يتطلب حساباً لقراءة الفصول — السكرابر يستخدم كوكيز حسابك للمسح. المهم بين الكوكيز ثلاثة فقط والبقية (إعلانات/تحليلات) تُتجاهل تلقائياً:\n'
          + '1) remember_... = «تذكرني» يصلح ≈ 5 سنوات — هو الموضوع ثابتاً في كود السكرابر.\n'
          + '2) PHPSESSID = جلسة قصيرة العمر (ساعات) — إن انتهى يعيد remember_ الدخول تلقائياً.\n'
          + '3) cf_clearance = حماية Cloudflare قصيرة ومرتبطة بجهازك/IP — جدّدها من هنا متى توقفت الجلسة.\n\n'
          + 'أسهل طريقة: افتح tomatomtl.com مسجلاً الدخول ← F12 ← Network ← اضغط أي طلب ← انسخ قيمة ترويسة «cookie» كاملة والصقها هنا (كل الكوكيز معاً).\n'
          + 'ترك الحقل فارغاً + حفظ = استخدام الكوكيز الثابتة في كود السكرابر.'}
        </p>
        <pre className="mt-3 bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-white/50 overflow-x-auto" dir="ltr">{TOMATOMTL_EXAMPLE}</pre>

        <textarea
          className={inputCls + ' font-mono text-xs mt-4'} rows={4}
          value={mtText} onChange={(e) => setMtText(e.target.value)}
          dir="ltr" placeholder="ترويسة Cookie كاملة — سطر واحد"
        />
        <div className="flex flex-wrap gap-3 mt-3">
          <button onClick={saveCookies} disabled={mtSaving} className={btnPrimary}>
            {mtSaving ? <Spinner /> : <Save size={15} />} حفظ وإرسال للسكرابر
          </button>
          <button onClick={checkSession} disabled={mtChecking} className={btnGhost}>
            {mtChecking ? <Spinner /> : <Activity size={15} />} فحص الجلسة
          </button>
        </div>
        {mtResult && (
          <div className={`mt-3 border rounded-xl px-4 py-3 text-xs leading-6 flex items-start gap-2 ${mtResult.ok ? 'border-green-400/40 text-green-400' : 'border-red-400/40 text-red-400'}`}>
            {mtResult.ok ? '✅' : '⚠️'} <span>{mtResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ الاستيراد التلقائي (واجهة السكرابر) ═══════════ */
const SCRAPER_URL = 'https://scraper-production-63ee.up.railway.app/scrape';
const SCHEDULER_URL = 'https://scraper-production-63ee.up.railway.app/scheduler';
const API_SECRET = 'Zeusndndjddnejdjdjdejekk29393838msmskxcm9239484jdndjdnddjj99292938338zeuslojdnejxxmejj82283849';

export function AutoImportPage() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [scheduler, setScheduler] = useState({ enabled: false, interval: 60 });
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try { setLogs(await adminService.getLogs()); }
    catch { /* صامت */ }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try { setWatchlist(await translatorService.getWatchlist()); }
    catch { /* صامت */ }
  }, []);

  const fetchScheduler = useCallback(async () => {
    try {
      const res = await fetch(`${SCHEDULER_URL}/config`, { headers: { Authorization: API_SECRET } });
      if (res.ok) {
        const data = await res.json();
        setScheduler({ enabled: !!data.enabled, interval: data.intervalMinutes || data.interval || 60 });
      }
    } catch { /* صامت */ }
  }, []);

  useEffect(() => {
    adminService.getLogs().then(setLogs).catch(() => {});
    fetchWatchlist();
    fetchScheduler();
    // تحديث السجلات دورياً أثناء السحب
    const t = setInterval(fetchLogs, 5000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const startScrape = async () => {
    if (!url.trim()) { toast.error('أدخل رابط الرواية'); return; }
    setBusy(true);
    try {
      const { api } = await import('../../services/api');
      await fetch(`${api.baseUrl}/api/scraper/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      const res = await fetch(SCRAPER_URL, {
        method: 'POST',
        headers: { Authorization: API_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) throw new Error(data.error);
      toast.success('بدأ السحب — تابع السجل الحي');
      fetchLogs();
    } catch (e: any) {
      toast.error(e?.message || 'فشل الاتصال بالسكرابر');
      fetchLogs();
    } finally { setBusy(false); }
  };

  const saveScheduler = async (patch: any) => {
    const next = { ...scheduler, ...patch };
    setScheduler(next);
    try {
      await fetch(`${SCHEDULER_URL}/config`, {
        method: 'POST',
        headers: { Authorization: API_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next.enabled, intervalMinutes: next.interval }),
      });
      toast.success('حُفظ إعداد الجدولة');
    } catch { toast.error('فشل حفظ الجدولة'); }
  };

  const updateAll = async () => {
    if (watchlist.length === 0) return;
    setBusy(true);
    toast.loading(`بدء تحديث ${watchlist.length} رواية…`, { id: 'update-all' });
    let ok = 0;
    for (const item of watchlist) {
      if (!item.sourceUrl) continue;
      try {
        const res = await fetch(SCRAPER_URL, {
          method: 'POST',
          headers: { Authorization: API_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.sourceUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data.error) ok++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch { /* يكمل البقية */ }
    }
    toast.success(`اكتمل تحديث ${ok}/${watchlist.length} رواية`, { id: 'update-all' });
    setBusy(false);
    fetchLogs();
  };

  return (
    <div>
      <PageHead title="الاستيراد التلقائي (السكرابر)" desc="اسحب رواية كاملة من أي موقع مدعوم — تابع الكونسول الحي ثم حدّث قائمة المتابعة">
        <button onClick={updateAll} disabled={busy || watchlist.length === 0} className={btnGhost}>
          <RefreshCcw size={15} /> تحديث كل المتبعة ({watchlist.length})
        </button>
      </PageHead>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* السحب */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><DownloadCloud size={15} /> سحب رواية من رابط</h3>
          <input className={inputCls} placeholder="https://m.wfxs.tw/xiaoshuo/2309384/" value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" />
          <p className="text-white/30 text-[11px] mt-2 mb-3">
            المواقع المدعومة: wfxs.tw، quanben.io، 69shu، novel543، twkan، jwxs، linovelib، novelfire، freewebnovel، rewayat، ar-no وغيرها (24 موقعاً)
          </p>
          <button onClick={startScrape} disabled={busy} className={btnPrimary + ' w-full'}>
            {busy ? <Spinner /> : <Play size={15} />} بدء السحب
          </button>

          {/* الجدولة */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <h4 className="text-white font-bold text-sm mb-3">التحديث التلقائي المجدول</h4>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                <input type="checkbox" checked={scheduler.enabled} onChange={(e) => saveScheduler({ enabled: e.target.checked })} className="accent-white" />
                مفعّل
              </label>
              <label className="flex items-center gap-2 text-white/60 text-xs">
                كل
                <input
                  type="number" min={10}
                  className="w-20 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs"
                  value={scheduler.interval}
                  onChange={(e) => setScheduler((p) => ({ ...p, interval: parseInt(e.target.value) || 60 }))}
                  onBlur={(e) => saveScheduler({ interval: parseInt(e.target.value) || 60 })}
                />
                دقيقة
              </label>
            </div>
          </div>
        </div>

        {/* الكونسول */}
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">كونسول السحب الحي</h3>
            <button onClick={fetchLogs} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70" aria-label="تحديث"><RefreshCcw size={14} /></button>
          </div>
          <div className="flex-1 max-h-[45vh] overflow-y-auto p-3 font-mono text-[11px] space-y-1" dir="rtl">
            {logs.length === 0 ? (
              <p className="text-white/30 text-center py-8">لا سجلات بعد — ابدأ سحباً</p>
            ) : logs.map((l) => (
              <div key={l._id} className={l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-green-400' : 'text-white/70'}>
                <span className="text-white/30 ml-2" dir="ltr">{new Date(l.timestamp).toLocaleTimeString('ar-EG')}</span>
                {l.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* قائمة المتابعة */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-bold text-sm">روايات المتابعة ({watchlist.length}) — تُحدّث تلقائياً حسب الجدولة</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-[40vh] overflow-y-auto">
          {watchlist.length === 0 ? (
            <p className="py-10 text-center text-white/40 text-sm">لا روايات متابعة — اسحب رواية لتُضاف تلقائياً</p>
          ) : watchlist.map((w, i) => (
            <motion.div key={w._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-4 py-3">
              {w.cover && <img src={w.cover} alt="" className="w-9 h-12 rounded object-cover bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{w.title}</p>
                <p className="text-white/30 text-[11px] truncate" dir="ltr">{w.sourceUrl || ''}</p>
              </div>
              {w.sourceUrl && (
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await fetch(SCRAPER_URL, { method: 'POST', headers: { Authorization: API_SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: w.sourceUrl }) });
                      toast.success(`بدأ فحص «${w.title}»`);
                      fetchLogs();
                    } catch { toast.error('فشل الاتصال'); }
                    finally { setBusy(false); }
                  }}
                  disabled={busy}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5"
                >
                  فحص تحديث
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
