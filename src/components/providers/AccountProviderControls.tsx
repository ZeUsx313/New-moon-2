import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, FileUp, Loader2, MessageSquarePlus, Send, X } from 'lucide-react';
import { accountProviderService, type AccountAttachment, type AccountCatalog, type AccountChat, type AccountProject } from '../../services/accountProviders';
import { isChatGPTProvider, isGeminiAccountProvider, TASK_PURPOSES, type AccountSettings, type ProviderModel, type TaskConversation, type TaskPurpose, type TranslationProvider } from '../../lib/translationProviders';

interface Props {
  provider: TranslationProvider;
  onChange: (field: keyof AccountSettings | 'thinkingEnabled' | 'searchEnabled' | 'baseUrl', value: unknown) => void;
  onTaskChange: (purpose: TaskPurpose, patch: TaskConversation) => void;
  onModels: (models: ProviderModel[]) => void;
  onPendingChange?: (busy: boolean) => void;
}
const input = 'w-full min-w-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/60 disabled:opacity-50';
const action = 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 disabled:opacity-40';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5"><span className="block text-xs text-white/75">{label}</span>{children}</label>;
}
export default function AccountProviderControls({ provider, onChange, onTaskChange, onModels, onPendingChange }: Props) {
  const id = useId(), gpt = isChatGPTProvider(provider), gemini = isGeminiAccountProvider(provider);
  const [purpose, setPurpose] = useState<TaskPurpose>('translation');
  const [catalog, setCatalog] = useState<AccountCatalog>();
  const [projects, setProjects] = useState<AccountProject[]>([]);
  const [projectCursor, setProjectCursor] = useState<string>();
  const [chats, setChats] = useState<AccountChat[]>([]);
  const [chatScope, setChatScope] = useState('');
  const [chatCursor, setChatCursor] = useState<string>();
  const [chatOffset, setChatOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [prompt, setPrompt] = useState(''), [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<AccountAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null), alive = useRef(true), inFlight = useRef(false);
  const tokenRef = useRef(provider.apiKeys[0]); tokenRef.current = provider.apiKeys[0];
  const pendingCallback = useRef(onPendingChange); pendingCallback.current = onPendingChange;
  useEffect(() => { alive.current = true; return () => { alive.current = false; pendingCallback.current?.(false); }; }, []);
  useEffect(() => {
    setCatalog(undefined); setProjects([]); setChats([]); setChatScope(''); setProjectCursor(undefined);
    setChatCursor(undefined); setChatOffset(0); setHasMore(false); setAttachments([]); setReply(''); setError(''); setNotice('');
  }, [provider.apiKeys[0]]);
  const task = provider.taskConversations?.[purpose] || {};
  const label = TASK_PURPOSES.find(p => p.id === purpose)!.label;
  const changeTask = (patch: TaskConversation) => onTaskChange(purpose, patch);
  async function run<T>(name: string, operation: () => Promise<T>, apply: (value: T) => void) {
    if (inFlight.current) return;
    if (!provider.apiKeys[0]?.trim()) { setError('الصق توكن الحساب أو الكوكيز أولًا، ثم اضغط ربط الحساب'); return; }
    inFlight.current = true;
    const token = provider.apiKeys[0];
    setBusy(name); setError(''); setNotice(''); pendingCallback.current?.(true);
    try { const value = await operation(); if (alive.current && tokenRef.current === token) apply(value); }
    catch (err) { if (alive.current && tokenRef.current === token) setError(err instanceof Error ? err.message : 'تعذر الاتصال بالمزوّد'); }
    finally { inFlight.current = false; if (alive.current) { setBusy(''); pendingCallback.current?.(false); } }
  }
  function setChatPage(items: AccountChat[], scope: string, total?: number, cursor?: string, more = false) {
    setChats(prev => more ? [...new Map([...prev, ...items].map(c => [c.id, c])).values()] : items);
    setChatScope(scope); setChatCursor(cursor);
    const next = (more ? chatOffset : 0) + items.length; setChatOffset(next);
    setHasMore(!!cursor || (!scope && (!gemini || next < 200) && (total === undefined ? items.length >= 50 : next < total)));
  }
  const connect = () => run('connect', () => accountProviderService.connect(provider), data => {
    setCatalog(data); setProjects(data.projects.items); setProjectCursor(data.projects.next_cursor || data.projects.cursor);
    setChatPage(data.chats.items, '', data.chats.total); onModels(data.models);
    if (gpt) {
      onChange('chatgptAccountId', ''); onChange('reasoningEffort', 'auto');
      for (const { id: target } of TASK_PURPOSES) {
        const saved = provider.taskConversations?.[target];
        const model = data.models.find(m => m.modelId === (saved?.model || provider.selectedModel));
        if (saved?.reasoningEffort && !model?.reasoningEfforts?.includes(saved.reasoningEffort)) onTaskChange(target, { reasoningEffort: 'auto' });
      }
    }
    if (data.detectedSettings?.geminiAccountIndex !== undefined) onChange('geminiAccountIndex', data.detectedSettings.geminiAccountIndex);
    setNotice('تم ربط الحساب وجلب الخيارات المتاحة. اختر إعدادات كل مهمة ثم احفظ.');
  });
  const loadChats = (projectId = task.projectId || '', more = false) => run('chats', async () => {
    if (projectId) return accountProviderService.projectChats(provider, projectId, more ? chatCursor : undefined);
    return accountProviderService.chats(provider, more ? chatOffset : 0, gemini && more ? chatOffset + 50 : 50);
  }, data => {
    const cursor = 'next_cursor' in data ? String(data.next_cursor || '') : 'cursor' in data ? String(data.cursor || '') : undefined;
    setChatPage(data.items, projectId, 'total' in data ? Number(data.total) : undefined, cursor, gemini ? false : more);
  });
  const selectChat = (conversationId: string) => {
    if (!conversationId) { changeTask({ conversationId: '', responseId: '', choiceId: '', parentMessageId: '', mode: 'per_job' }); return; }
    const target = purpose;
    return run('conversation', () => accountProviderService.conversation(provider, conversationId), data => {
      onTaskChange(target, { conversationId, projectId: data.projectId || chatScope, responseId: data.responseId || '',
        choiceId: data.choiceId || '', parentMessageId: data.parentMessageId == null ? '' : String(data.parentMessageId), mode: 'reuse' });
      setNotice('تم اختيار المحادثة لهذه المهمة. احفظ الإعدادات.');
    });
  };
  const send = (createNew: boolean) => {
    if (!createNew && !prompt.trim()) { setError('اكتب رسالة التجربة'); return; }
    const target = purpose;
    return run('send', () => accountProviderService.send(provider, target, createNew ? '' : prompt.trim(), createNew, createNew ? [] : attachments), data => {
      setReply(data.reply); setAttachments([]);
      if (data.context?.conversationId) {
        onTaskChange(target, { ...data.context, mode: 'reuse' });
        setChats(prev => [{ id: data.context.conversationId!, title: `محادثة ${label} الجديدة` }, ...prev.filter(c => c.id !== data.context.conversationId)]);
        setChatScope(task.projectId || '');
      }
      setNotice('وصل الرد. احفظ الإعدادات للاحتفاظ بالمحادثة المختارة.');
    });
  };
  const upload = (file: File) => run('upload', () => accountProviderService.upload(provider, file), data => {
    setAttachments(prev => [...prev, { ...data.attachment, displayName: file.name }]); setNotice('رُفع المرفق لرسالة التجربة التالية.');
  });
  const sameScope = chatScope === (task.projectId || '');
  return <section aria-labelledby={`${id}-title`} className="mt-4 space-y-4 rounded-xl border border-white/15 bg-white/[0.025] p-3 sm:p-4">
    <h2 id={`${id}-title`} className="text-sm font-extrabold text-white">إعدادات الحساب والمحادثات</h2>
    <p className="text-xs leading-relaxed text-white/50">الصق توكن الحساب أو الكوكيز في حقل بيانات الحساب، ثم اربط الحساب. تُجلب المعرّفات والإعدادات الداخلية تلقائيًا.</p>
    <button type="button" disabled={!!busy} onClick={connect} className={action}>{catalog ? 'تحديث بيانات الحساب' : 'ربط الحساب وجلب الخيارات'}</button>
    {error && <p role="alert" className="break-words rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
    {notice && <p role="status" className="flex gap-2 text-xs text-green-300"><Check size={15} className="shrink-0" />{notice}</p>}
    {busy && <p role="status" className="flex items-center gap-2 text-xs text-white/60"><Loader2 size={15} className="animate-spin" />جارٍ الاتصال بالمزوّد…</p>}
    {catalog?.warnings?.map(w => <p key={w} className="text-xs text-amber-200">{w}</p>)}
    {!catalog && <p className="text-xs text-white/50">الإعداد الافتراضي ينشئ محادثة مستقلة لكل مهمة تلقائيًا. لعرض محادثاتك المحفوظة اربط الحساب.</p>}
    {catalog && <fieldset disabled={!!busy} className="min-w-0 space-y-4">
      <legend className="sr-only">محادثات المهام</legend>
      <p className="text-xs text-white/70">الحساب المتصل: {catalog.profile.name}</p>
      <div role="group" aria-label="اختيار المهمة" className="flex flex-wrap gap-1.5">{TASK_PURPOSES.map(p => <button key={p.id} type="button" aria-pressed={purpose === p.id} className={`${action} ${purpose === p.id ? 'bg-white !text-black' : ''}`} onClick={() => { setPurpose(p.id); setReply(''); setNotice(''); const scope = provider.taskConversations?.[p.id]?.projectId || ''; if (scope !== chatScope) loadChats(scope); }}>{p.label}</button>)}</div>
      <Field label={`نموذج ${label}`}><select className={input} value={task.model || ''} onChange={e => changeTask({ model: e.target.value, reasoningEffort: 'auto' })}><option value="">نموذج المزوّد الافتراضي</option>{catalog.models.map(m => <option key={m.modelId} value={m.modelId}>{m.modelName}</option>)}</select></Field>
      {gpt && (() => {
        const model = catalog.models.find(m => m.modelId === (task.model || provider.selectedModel));
        return model?.reasoningEfforts?.length ? <Field label={`تفكير ${label}`}><select className={input} value={task.reasoningEffort || 'auto'} onChange={e => changeTask({ reasoningEffort: e.target.value })}><option value="auto">اختيار الحساب التلقائي</option>{model.reasoningEfforts.map(level => <option key={level} value={level}>{({ low: 'خفيف', medium: 'متوسط', high: 'عالٍ', extended: 'موسّع' } as Record<string, string>)[level] || level}</option>)}</select></Field> : <p className="text-[11px] text-white/45">يُستخدم إعداد التفكير الافتراضي للحساب؛ لم يعلن هذا النموذج مستويات إضافية للاختيار.</p>;
      })()}
      {gpt && catalog.capabilities.projects && <>
        <Field label={`مشروع ${label}`}><select className={input} value={task.projectId || ''} onChange={e => {
          const value = e.target.value; changeTask({ projectId: value, conversationId: '', responseId: '', choiceId: '', parentMessageId: '', mode: 'per_job' });
          setChats([]); setChatScope(value); setHasMore(false); loadChats(value);
        }}><option value="">خارج المشاريع</option>{task.projectId && !projects.some(p => p.id === task.projectId) && <option value={task.projectId}>المشروع المحفوظ</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <button type="button" onClick={() => run('projects', () => accountProviderService.projects(provider, projectCursor), data => {
          setProjects(prev => [...new Map([...prev, ...data.items].map(p => [p.id, p])).values()]); setProjectCursor(data.next_cursor || data.cursor);
        })} className={action}>{projectCursor ? 'مزيد من المشاريع' : 'تحديث المشاريع'}</button>
      </>}
      {catalog.capabilities.chats && <>
        <button type="button" className={action} onClick={() => loadChats()}>{task.projectId ? 'تحديث محادثات المشروع' : 'تحديث المحادثات'}</button>
        <Field label={`محادثة ${label}`}><select className={input} value={task.conversationId || ''} onChange={e => selectChat(e.target.value)}>
          <option value="">إنشاء محادثة مستقلة تلقائيًا عند التشغيل</option>
          {task.conversationId && (!sameScope || !chats.some(c => c.id === task.conversationId)) && <option value={task.conversationId}>المحادثة المحفوظة لهذه المهمة</option>}
          {sameScope && chats.map(c => <option key={c.id} value={c.id}>{c.title || 'محادثة بدون عنوان'}</option>)}
        </select></Field>
        {hasMore && sameScope && <button type="button" className={action} onClick={() => loadChats(task.projectId || '', true)}>مزيد من المحادثات</button>}
      </>}
      <button type="button" className={action} onClick={() => send(true)}><MessageSquarePlus size={14} />إنشاء محادثة {label}{task.projectId ? ' في المشروع' : ''}</button>
      <p className="text-[11px] text-white/45">إنشاء المحادثة يرسل تعليمات قصيرة لتهيئتها لهذه المهمة تلقائيًا. لكل مهمة اختيار مستقل.</p>
      {!gpt && !gemini && <div className="space-y-2">{(['thinkingEnabled', 'searchEnabled'] as const).map(key => <label key={key} className="flex items-center gap-2 text-xs text-white/75"><input type="checkbox" checked={key === 'thinkingEnabled' ? !!provider[key] : provider[key] !== false} onChange={e => onChange(key, e.target.checked)} />{key === 'thinkingEnabled' ? 'تفعيل التفكير' : 'تفعيل البحث'}</label>)}</div>}
      <details className="space-y-3 border-t border-white/10 pt-3"><summary className="cursor-pointer text-xs text-white/75">تجربة المحادثة والمرفقات (اختياري)</summary>
        <Field label="رسالة التجربة"><textarea className={`${input} min-h-24`} value={prompt} onChange={e => setPrompt(e.target.value)} /></Field>
        {catalog.capabilities.attachments && <>
          <input ref={fileRef} type="file" className="sr-only" aria-label="اختيار صورة أو ملف" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(file); }} />
          <button type="button" disabled={attachments.length >= 10} onClick={() => fileRef.current?.click()} className={action}><FileUp size={14} />إرفاق صورة أو ملف</button>
          {attachments.length > 0 && <><button type="button" onClick={() => setAttachments([])} className={action}><X size={14} />مسح المرفقات</button><ul aria-label="المرفقات المجهزة" className="text-xs text-white/65">{attachments.map((item, i) => <li key={i}>{item.displayName}</li>)}</ul></>}
          <p className="text-[11px] text-white/45">حد المرفق 10 MB؛ المرفقات تخص رسالة التجربة التالية.</p>
        </>}
        <button type="button" disabled={!prompt.trim()} onClick={() => send(false)} className={action}><Send size={14} />إرسال الرسالة</button>
      </details>
    </fieldset>}
    {reply && <p className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/80" dir="auto">{reply}</p>}
  </section>;
}
