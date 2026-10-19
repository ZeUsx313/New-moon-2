import { ApiError, http } from '../lib/http';
import type { ProviderModel, TaskConversation, TaskPurpose, TranslationProvider } from '../lib/translationProviders';

export interface AccountChat { id: string; title?: string }
export interface AccountProject { id: string; name: string; chats: AccountChat[] }
export interface AccountAttachment {
  displayName?: string;
  uri?: string;
  name?: string;
  mime?: string;
  kind?: string;
  attachment?: { id: string; name: string; mime_type?: string; size?: number };
  part?: Record<string, unknown>;
}
export interface AccountReply { reply: string; context: TaskConversation }
const PREFIX = '/api/translator/accounts';
async function call<T>(action: string, provider: TranslationProvider, body: Record<string, unknown> = {}, timeoutMs = 60000): Promise<T> {
  try {
    return await http.post<T>(`${PREFIX}/${action}`, { provider, ...body }, { auth: true, retries: 0, timeoutMs });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError('الخادم المتصل لا يدعم إعدادات حسابات المزودين بعد. حدّث الخادم إلى الإصدار الذي يدعم /api/translator/accounts أو اضبط VITE_API_URL.', 404);
    }
    throw error;
  }
}
export const accountProviderService = {
  models(provider: TranslationProvider) { return call<{ models: ProviderModel[] }>('models', provider); },
  projects(provider: TranslationProvider, cursor?: string) { return call<{ items: AccountProject[]; cursor?: string; next_cursor?: string }>('projects', provider, { ...(cursor ? { cursor } : {}) }); },
  chats(provider: TranslationProvider, offset = 0) { return call<{ items: AccountChat[]; total?: number }>('chats', provider, { offset }); },
  conversation(provider: TranslationProvider, conversationId: string) { return call<{ id: string; title?: string; projectId?: string }>('conversation', provider, { conversationId }); },
  send(provider: TranslationProvider, purpose: TaskPurpose, prompt: string, createNew: boolean, attachments: AccountAttachment[]) {
    return call<AccountReply>('send', provider, { purpose, prompt, createNew, attachments }, 310000);
  },
  async upload(provider: TranslationProvider, file: File): Promise<{ attachment: AccountAttachment }> {
    if (file.size > 10 * 1024 * 1024) throw new Error('الحد الأقصى لحجم المرفق 10 MB');
    const data = new FormData(); data.append('provider', JSON.stringify(provider)); data.append('file', file, file.name);
    try {
      return await http.post(`${PREFIX}/upload`, data, { auth: true, rawBody: true, retries: 0, timeoutMs: 310000 });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw new ApiError('رفع مرفقات الحسابات يحتاج تحديث الخادم المتصل إلى الإصدار الجديد.', 404);
      throw error;
    }
  },
};
