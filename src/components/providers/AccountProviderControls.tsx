import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, FileUp, Loader2, MessageSquarePlus, Send, X } from 'lucide-react';
import { accountProviderService, type AccountAttachment, type AccountChat, type AccountProject } from '../../services/accountProviders';
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
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block min-w-0 space-y-1.5"><span className="block text-xs text-white/75">{label}</span>{children}{hint && <span className="block text-[11px] leading-relaxed text-white/45">{hint}</span>}</label>;
}
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-white/80"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-white" />{label}</label>;
}

export default function AccountProviderControls({ provider, onChange, onTaskChange, onModels, onPendingChange }: Props) {
  const id = useId();
  const gpt = isChatGPTProvider(provider), gemini = isGeminiAccountProvider(provider);
  const [purpose, setPurpose] = useState<TaskPurpose>('translation');
  const [projects, setProjects] = useState<AccountProject[]>([]);
  const [projectCursor, setProjectCursor] = useState<string>();
  const [chats, setChats] = useState<AccountChat[]>([]);
  const [chatProjectId, setChatProjectId] = useState('');
  const [chatOffset, setChatOffset] = useState(0);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState<{ text: string; purpose: TaskPurpose }>();
  const [attachments, setAttachments] = useState<AccountAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const tokenRef = useRef(provider.apiKeys[0]);
  tokenRef.current = provider.apiKeys[0];
  const pendingCallback = useRef(onPendingChange);
  pendingCallback.current = onPendingChange;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; pendingCallback.current?.(false); };
  }, []);
  useEffect(() => {
    setProjects([]); setProjectCursor(undefined); setChats([]); setChatProjectId('');
    setHasMoreChats(false); setChatOffset(0); setAttachments([]); setReply(undefined);
    setError(''); setNotice('');
  }, [provider.apiKeys[0]]);
  const task = provider.taskConversations?.[purpose] || {};
  const purposeLabel = TASK_PURPOSES.find(p => p.id === purpose)!.label;
  const selectedProject = projects.find(p => p.id === task.projectId);

  async function run<T>(name: string, operation: () => Promise<T>, apply: (value: T) => void) {
    if (inFlight.current) return;
    if (!provider.apiKeys[0]?.trim()) { setError('أدخل بيانات الحساب في حقل المفاتيح أولًا'); return; }
    inFlight.current = true;
    const token = provider.apiKeys[0];
    setBusy(name); setError(''); setNotice(''); pendingCallback.current?.(true);
    try {
      const value = await operation();
      if (alive.current && tokenRef.current === token) apply(value);
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'تعذر الاتصال بالمزوّد');
    } finally {
      inFlight.current = false;
      if (alive.current) { setBusy(''); pendingCallback.current?.(false); }
    }
  }
  const changeTask = (patch: TaskConversation) => onTaskChange(purpose, patch);
  const textField = (label: string, key: keyof AccountSettings, hint?: string) => <Field label={label} hint={hint}><input className={input} dir="ltr" autoComplete="off" spellCheck={false} value={String(provider[key] ?? '')} onChange={e => onChange(key, e.target.value)} /></Field>;
  const numberField = (label: string, key: keyof AccountSettings, fallback: number, min: number, max: number, step = 1) => <Field label={label} hint={`الافتراضي: ${fallback}، المدى: ${min}–${max}`}><input className={input} type="number" dir="ltr" min={min} max={max} step={step} placeholder={String(fallback)} value={typeof provider[key] === 'number' ? provider[key] as number : ''} onChange={e => onChange(key, e.target.value === '' ? undefined : Number(e.target.value))} /></Field>;
  const taskField = (label: string, key: keyof TaskConversation, hint?: string) => <Field label={label} hint={hint}><input className={input} dir="ltr" autoComplete="off" spellCheck={false} value={String(task[key] ?? '')} onChange={e => changeTask(key === 'projectId' ? { projectId: e.target.value, conversationId: '', mode: 'per_job' } : { [key]: e.target.value })} /></Field>;

  const loadProjects = (more = false) => run('projects', () => accountProviderService.projects(provider, more ? projectCursor : undefined), data => {
    setProjects(prev => more ? [...new Map([...prev, ...data.items].map(p => [p.id, p])).values()] : data.items);
    setProjectCursor(data.next_cursor || data.cursor || undefined);
  });
  const loadChats = (more = false) => run('chats', () => accountProviderService.chats(provider, more ? chatOffset : 0), data => {
    setChats(prev => more ? [...new Map([...prev, ...data.items].map(c => [c.id, c])).values()] : data.items);
    setChatProjectId('');
    const offset = (more ? chatOffset : 0) + data.items.length;
    setChatOffset(offset); setHasMoreChats(data.total === undefined ? data.items.length >= 50 : offset < data.total);
  });
  const selectChat = (chat: AccountChat) => {
    const target = purpose;
    return run('conversation', () => accountProviderService.conversation(provider, chat.id), data => {
      onTaskChange(target, { conversationId: chat.id, projectId: data.projectId || chatProjectId, mode: 'reuse' });
      setNotice('تم اختيار المحادثة. احفظ الإعدادات لتثبيت الاختيار.');
    });
  };
  const send = (createNew: boolean) => {
    if (!prompt.trim()) { setError('اكتب رسالة قبل الإرسال'); return; }
    const target = purpose;
    return run('send', () => accountProviderService.send(provider, target, prompt.trim(), createNew, attachments), data => {
      setReply({ text: data.reply, purpose: target }); setAttachments([]);
      if (data.context?.conversationId) onTaskChange(target, { ...data.context, mode: 'reuse' });
      setNotice('وصل الرد. احفظ الإعدادات للاحتفاظ بالمحادثة المختارة.');
    });
  };
  const upload = (file: File) => {
    if (attachments.length >= 10) { setError('يمكن تجهيز عشرة مرفقات كحد أقصى'); return; }
    return run('upload', () => accountProviderService.upload(provider, file), data => {
      setAttachments(prev => [...prev, { ...data.attachment, displayName: file.name }]);
      setNotice('رُفع الملف؛ سيُرفق بالرسالة التالية في لوحة التجربة.');
    });
  };

  return <section aria-labelledby={`${id}-title`} className="mt-4 space-y-4 rounded-xl border border-white/15 bg-white/[0.025] p-3 sm:p-4">
    <h2 id={`${id}-title`} className="text-sm font-extrabold text-white">إعدادات الحساب والمحادثات</h2>
    <p className="text-xs leading-relaxed text-white/50">اختر محادثة لكل مهمة أو اترك الخادم ينشئها تلقائيًا. اختيار الحساب في هذه اللوحة يستخدم أول رمز مُدخل. احفظ الإعدادات بعد التعديل.</p>
    {error && <p role="alert" className="break-words rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">{error}</p>}
    {notice && <p role="status" className="flex items-start gap-2 text-xs leading-relaxed text-green-300"><Check size={15} className="shrink-0" />{notice}</p>}
    {busy && <p role="status" className="flex items-center gap-2 text-xs text-white/60"><Loader2 size={15} className="animate-spin" />جارٍ الاتصال بالمزوّد…</p>}
    <fieldset disabled={!!busy} className="space-y-4 disabled:opacity-75">
      <legend className="sr-only">خيارات الحساب</legend>
      {numberField('حجم جزء الترجمة بالأحرف', 'translationChunkChars', 2400, 500, 6000)}
      <p className="text-[11px] leading-relaxed text-white/45">الخادم يفحص تغطية فقرات الفصل ويعيد الأجزاء غير المكتملة قبل الحفظ. هذا الإعداد يُستخدم في المترجم الذكي والمترجم الخالص.</p>
      {gpt && <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {textField('معرّف حساب ChatGPT', 'chatgptAccountId', 'اختياري إذا كان موجودًا في access token؛ عند تدوير حسابات مختلفة يُفضّل تركه فارغًا.')}
        {textField('مستوى التفكير العام', 'reasoningEffort', 'فارغ أو auto = اختيار الحساب. قبول المستويات الأخرى يعتمد على النموذج والحساب ولم يُثبت في الملف المرفق.')}
      </div>}
      {gemini && <>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {numberField('رقم حساب Google', 'geminiAccountIndex', 1, 0, 20)}
          {textField('Build label', 'geminiBuildLabel', 'اتركه فارغًا لاستخدام قيمة عميل Gemini المرفق.')}
        </div>
        {textField('ترويسة نموذج Gemini JSPB', 'geminiModelHeader', 'مصفوفة JSON مثبتة من جلسة الحساب؛ الاسم وحده لا يغير النموذج.')}
        <CheckField label="السماح بوضع الضيف عند فشل الحساب" checked={provider.allowGuestFallback === true} onChange={v => onChange('allowGuestFallback', v)} />
        <p className="text-[11px] leading-relaxed text-white/50">عميل Gemini المرفق لا يثبت التحكم بالتفكير أو جلب قوائم المشاريع والمحادثات. يمكنك إنشاء محادثة هنا أو إدخال معرّفاتها يدويًا. وضع الضيف لا يحافظ على محادثة مختارة أو مرفقات.</p>
      </>}
      {!gpt && !gemini && <>
        <Field label="رابط خدمة DeepSeek 3MH"><input className={input} type="url" dir="ltr" value={provider.baseUrl || ''} placeholder="https://deepseek-pow.contact-3mh.workers.dev" onChange={e => onChange('baseUrl', e.target.value)} /></Field>
        <p className="text-[11px] leading-relaxed text-white/50">خدمة 3MH تستخدم توكن حساب DeepSeek الخاص بك وتحل PoW تلقائيًا. يصل التوكن إلى الخدمة عند استخدامها.</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {numberField('Temperature', 'temperature', 0.7, 0, 2, 0.1)}
          {numberField('Max tokens', 'maxTokens', 16384, 256, 131072)}
          {numberField('Presence penalty', 'presencePenalty', 0, -2, 2, 0.1)}
          {numberField('Frequency penalty', 'frequencyPenalty', 0, -2, 2, 0.1)}
        </div>
        <CheckField label="تفعيل التفكير" checked={!!provider.thinkingEnabled} onChange={v => onChange('thinkingEnabled', v)} />
        <CheckField label="تفعيل البحث" checked={provider.searchEnabled !== false} onChange={v => onChange('searchEnabled', v)} />
      </>}
    </fieldset>

    <fieldset disabled={!!busy} className="min-w-0 space-y-4 border-t border-white/10 pt-4">
      <legend className="sr-only">محادثات المهام</legend>
      <div role="group" aria-label="اختيار المهمة" className="flex flex-wrap gap-1.5">
        {TASK_PURPOSES.map(p => <button key={p.id} type="button" aria-pressed={purpose === p.id} onClick={() => { setPurpose(p.id); setError(''); setNotice(''); }} className={`${action} ${purpose === p.id ? 'bg-white !text-black' : ''}`}>{p.label}</button>)}
      </div>
      <fieldset className="space-y-2"><legend className="mb-2 text-xs font-bold text-white/80">سلوك محادثة {purposeLabel}</legend>
        {([['per_job', 'محادثة مستقلة لكل مهمة تشغيل'], ['new', 'محادثة جديدة لكل طلب'], ['reuse', 'استخدام المحادثة المختارة']] as const).map(([mode, label]) => <label key={mode} className="flex items-center gap-2 text-xs text-white/75"><input type="radio" name={`${id}-${purpose}-mode`} checked={(task.mode || 'per_job') === mode} onChange={() => changeTask({ mode })} className="accent-white" />{label}</label>)}
      </fieldset>
      {gpt && <>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => loadProjects()} className={action}>جلب المشاريع</button>
          {projectCursor && <button type="button" disabled={!!busy} onClick={() => loadProjects(true)} className={action}>مزيد من المشاريع</button>}
          <button type="button" disabled={!!busy} onClick={() => run('models', () => accountProviderService.models(provider), data => onModels(data.models))} className={action}>جلب نماذج الحساب</button>
        </div>
        <Field label={`مشروع ${purposeLabel}`} hint="اختيار مشروع مختلف يمسح المحادثة السابقة لهذه المهمة.">
          <select className={input} value={task.projectId || ''} onChange={e => {
            const project = projects.find(p => p.id === e.target.value);
            changeTask({ projectId: e.target.value, conversationId: '', mode: 'per_job' });
            setChats(project?.chats || []); setChatProjectId(e.target.value); setHasMoreChats(false);
          }}><option value="">خارج المشاريع</option>
            {task.projectId && !selectedProject && <option value={task.projectId}>المشروع المحفوظ: {task.projectId}</option>}
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </Field>
        {taskField('معرّف المشروع يدويًا', 'projectId')}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => loadChats()} className={action}>جلب المحادثات العامة</button>
          {hasMoreChats && <button type="button" disabled={!!busy} onClick={() => loadChats(true)} className={action}>مزيد من المحادثات</button>}
          {selectedProject && <button type="button" onClick={() => { setChats(selectedProject.chats || []); setChatProjectId(selectedProject.id); setHasMoreChats(false); }} className={action}>عرض محادثات المشروع</button>}
        </div>
        {chats.length > 0 && <div aria-label="المحادثات المتاحة" className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
          {chats.map(chat => <button key={chat.id} type="button" disabled={!!busy} onClick={() => selectChat(chat)} aria-pressed={task.conversationId === chat.id} className={`${action} w-full !justify-start text-right break-words ${task.conversationId === chat.id ? 'bg-white/15' : ''}`}><MessageSquarePlus size={14} className="shrink-0" />{chat.title || chat.id}</button>)}
        </div>}
      </>}
      {taskField(`معرّف محادثة ${purposeLabel}`, 'conversationId')}
      {gemini && <div className="grid min-w-0 gap-3 sm:grid-cols-2">{taskField('Response ID', 'responseId')}{taskField('Choice ID', 'choiceId')}</div>}
      {!gpt && !gemini && taskField('Parent message ID', 'parentMessageId')}
      {!gemini && taskField(`نموذج ${purposeLabel}`, 'model', 'فارغ = نموذج المزوّد العام.')}
      {gpt && taskField(`تفكير ${purposeLabel}`, 'reasoningEffort', 'فارغ أو auto = الإعداد العام. دعم المستويات يعتمد على النموذج.')}
    </fieldset>

    {(gpt || gemini) && <fieldset disabled={!!busy} className="space-y-3 border-t border-white/10 pt-4">
      <legend className="sr-only">تجربة الحساب وإنشاء المحادثات</legend>
      <h3 className="text-xs font-bold text-white">تجربة محادثة {purposeLabel} وإنشاؤها</h3>
      <Field label="رسالة التجربة"><textarea className={`${input} min-h-24`} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="اكتب رسالة لبدء المحادثة أو متابعتها" /></Field>
      <input ref={fileRef} type="file" className="sr-only" aria-label="اختيار صورة أو ملف" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(file); }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy || attachments.length >= 10} onClick={() => fileRef.current?.click()} className={action}><FileUp size={14} />إرفاق صورة أو ملف</button>
        {attachments.length > 0 && <button type="button" onClick={() => setAttachments([])} className={action}><X size={14} />مسح المرفقات</button>}
      </div>
      {attachments.length > 0 && <ul aria-label="المرفقات المجهزة" className="space-y-1 text-xs text-white/65">{attachments.map((item, index) => <li key={index} className="break-all">{item.displayName}</li>)}</ul>}
      <p className="text-[11px] leading-relaxed text-white/45">حد المرفق 10 MB. المرفقات تخص رسالة التجربة التالية ولا تضاف تلقائيًا إلى مهام ترجمة الفصول.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy || !prompt.trim()} onClick={() => send(false)} className={action}><Send size={14} />إرسال الرسالة</button>
        <button type="button" disabled={!!busy || !prompt.trim()} onClick={() => send(true)} className={action}><MessageSquarePlus size={14} />{gpt && task.projectId ? 'إنشاء محادثة في المشروع' : 'إنشاء محادثة جديدة'}</button>
      </div>
    </fieldset>}
    {reply && <div className="space-y-2 rounded-lg border border-white/15 p-3"><h3 className="text-xs font-bold text-white">رد {TASK_PURPOSES.find(p => p.id === reply.purpose)?.label}</h3><p className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/80" dir="auto">{reply.text}</p></div>}
  </section>;
}
