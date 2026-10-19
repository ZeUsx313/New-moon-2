import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountProviderService } from '../src/services/accountProviders';
import { api } from '../src/services/api';
import type { TranslationProvider } from '../src/lib/translationProviders';
const provider: TranslationProvider = { providerId: 'chatgpt_1', name: 'GPT', apiKeys: ['fake-account-token'], chatgptAccountId: 'account', taskConversations: { translation: { projectId: 'p', conversationId: 'c', mode: 'reuse' } } };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); localStorage.setItem('token', 'admin-session'); });
afterEach(() => vi.unstubAllGlobals());
describe('Site → account API contract', () => {
  it('lists models with site Authorization and account data in JSON body', async () => {
    fetchMock.mockResolvedValue(json({ models: [{ modelId: 'auto', modelName: 'Auto' }] }));
    await accountProviderService.models(provider);
    const [url, options] = fetchMock.mock.calls[0]; expect(url).toBe(api.baseUrl + '/api/translator/accounts/models');
    expect(options.headers.Authorization).toBe('Bearer admin-session'); expect(JSON.parse(options.body).provider.apiKeys).toEqual(['fake-account-token']);
  });
  it('preserves project cursor, chat offset and conversation ID', async () => {
    fetchMock.mockImplementation(async () => json({ items: [] }));
    await accountProviderService.projects(provider, 'next-cursor'); await accountProviderService.chats(provider, 50); await accountProviderService.conversation(provider, 'chat-1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cursor).toBe('next-cursor');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).offset).toBe(50); expect(JSON.parse(fetchMock.mock.calls[2][1].body).conversationId).toBe('chat-1');
  });
  it('sends purpose/createNew/attachments unchanged and does not retry mutating requests', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Provider HTTP 500' }, 500));
    await expect(accountProviderService.send(provider, 'glossary', 'Build glossary', true, [{ uri: 'file-uri' }])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1); const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ purpose: 'glossary', prompt: 'Build glossary', createNew: true, attachments: [{ uri: 'file-uri' }] });
  });
  it('uploads multipart with browser-generated boundary and correct site token', async () => {
    fetchMock.mockResolvedValue(json({ attachment: { uri: 'uri' } }));
    const file = new File(['chapter text'], 'chapter.txt', { type: 'text/plain' });
    await accountProviderService.upload(provider, file);
    const options = fetchMock.mock.calls[0][1]; expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers).not.toHaveProperty('Content-Type'); expect(options.headers.Authorization).toBe('Bearer admin-session');
    expect(options.body.get('file').name).toBe('chapter.txt'); expect(JSON.parse(options.body.get('provider')).providerId).toBe(provider.providerId);
  });
  it('rejects oversized upload before making a network call', async () => {
    const file = new File(['x'], 'big.txt'); Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });
    await expect(accountProviderService.upload(provider, file)).rejects.toThrow(/10 MB/); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('explains incompatible backend endpoints without caching credentials', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Not found' }, 404));
    await expect(accountProviderService.models(provider)).rejects.toThrow(/حدّث الخادم/);
    expect(localStorage.getItem('token')).toBe('admin-session'); expect(localStorage.length).toBe(1); expect(sessionStorage.length).toBe(0);
  });
  it('propagates authentication failure', async () => {
    fetchMock.mockResolvedValue(json({ message: 'انتهت جلسة الحساب' }, 401));
    await expect(accountProviderService.models(provider)).rejects.toThrow('انتهت جلسة الحساب'); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
