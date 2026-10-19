export const TASK_PURPOSES = [
  { id: 'translation', label: 'الترجمة' },
  { id: 'glossary', label: 'المصطلحات' },
  { id: 'review', label: 'المراجعة' },
  { id: 'titles', label: 'العناوين' },
  { id: 'metadata', label: 'البيانات' },
] as const;
export type TaskPurpose = typeof TASK_PURPOSES[number]['id'];
export type ConversationMode = 'per_job' | 'new' | 'reuse';
export interface TaskConversation {
  mode?: ConversationMode;
  projectId?: string;
  conversationId?: string;
  responseId?: string;
  choiceId?: string;
  parentMessageId?: string;
  model?: string;
  reasoningEffort?: string;
}
export interface ProviderModel { modelId: string; modelName: string }
export interface AccountSettings {
  chatgptAccountId?: string;
  reasoningEffort?: string;
  geminiAccountIndex?: number;
  geminiBuildLabel?: string;
  geminiModelHeader?: string;
  allowGuestFallback?: boolean;
  temperature?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  translationChunkChars?: number;
  taskConversations?: Partial<Record<TaskPurpose, TaskConversation>>;
}
export interface TranslationProvider extends AccountSettings {
  providerId: string;
  name: string;
  apiKeys: string[];
  baseUrl?: string;
  selectedModel?: string;
  models?: ProviderModel[];
  priority?: number;
  thinkingEnabled?: boolean;
  searchEnabled?: boolean;
  deepSeekModelType?: string;
  deepSeekTokens?: string[];
  qwenTokens?: string[];
  powProviders?: { id: string; name: string; url: string }[];
  selectedPowProviderId?: string;
}
export const ACCOUNT_SETTING_KEYS = [
  'chatgptAccountId', 'reasoningEffort', 'geminiAccountIndex', 'geminiBuildLabel', 'geminiModelHeader',
  'allowGuestFallback', 'temperature', 'maxTokens', 'presencePenalty', 'frequencyPenalty',
  'translationChunkChars', 'taskConversations',
] as const satisfies readonly (keyof AccountSettings)[];

export const isChatGPTProvider = (p: Pick<TranslationProvider, 'providerId'>) => /^chatgpt(?:_|$)/i.test(p.providerId || '');
export const isDeepSeekWorkerProvider = (p: Pick<TranslationProvider, 'providerId'>) => /^deepseek_worker(?:_|$)/i.test(p.providerId || '');
export const isGeminiAccountProvider = (p: Pick<TranslationProvider, 'providerId'>) => /^gemini_web(?:_|$)/i.test(p.providerId || '');
export const isAccountProvider = (p: Pick<TranslationProvider, 'providerId'>) => isChatGPTProvider(p) || isDeepSeekWorkerProvider(p) || isGeminiAccountProvider(p);

/** Carry the server's complete account configuration through load/edit/save. No browser persistence. */
export function pickAccountSettings(provider: AccountSettings): AccountSettings {
  return Object.fromEntries(ACCOUNT_SETTING_KEYS.filter(key => provider[key] !== undefined).map(key => [key,
    key === 'taskConversations' ? structuredClone(provider.taskConversations || {}) : provider[key],
  ])) as AccountSettings;
}
export function validateAccountSettings(provider: TranslationProvider): void {
  if (!isAccountProvider(provider)) return;
  for (const { id, label } of TASK_PURPOSES) {
    const task = provider.taskConversations?.[id];
    if (task?.mode === 'reuse' && !task.conversationId?.trim()) throw new Error(`اختر محادثة لمهمة ${label} أو غيّر سلوك المحادثة`);
  }
  const ranges: [keyof AccountSettings, number, number, string, boolean?][] = [
    ['translationChunkChars', 500, 6000, 'حجم جزء الترجمة', true],
    ['geminiAccountIndex', 0, 20, 'رقم حساب Google', true],
    ['temperature', 0, 2, 'Temperature'], ['maxTokens', 256, 131072, 'Max tokens', true],
    ['presencePenalty', -2, 2, 'Presence penalty'], ['frequencyPenalty', -2, 2, 'Frequency penalty'],
  ];
  for (const [key, min, max, label, integer] of ranges) {
    const value = provider[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${label}: أدخل ${integer ? 'عددًا صحيحًا' : 'عددًا'} بين ${min} و${max}`);
    }
  }
  if (isDeepSeekWorkerProvider(provider) && provider.baseUrl) {
    try { if (new URL(provider.baseUrl).protocol !== 'https:') throw new Error(); }
    catch { throw new Error('رابط خدمة DeepSeek Worker يجب أن يكون رابط HTTPS صحيحًا'); }
  }
  if (provider.geminiModelHeader) {
    try { if (!Array.isArray(JSON.parse(provider.geminiModelHeader))) throw new Error(); }
    catch { throw new Error('ترويسة نموذج Gemini يجب أن تكون مصفوفة JSON صحيحة'); }
  }
}
