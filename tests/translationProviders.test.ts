import { describe, expect, it } from 'vitest';
import { isAccountProvider, isChatGPTProvider, isDeepSeekWorkerProvider, pickAccountSettings, validateAccountSettings, type TranslationProvider } from '../src/lib/translationProviders';
const base: TranslationProvider = { providerId: 'chatgpt_1', name: 'GPT', apiKeys: ['fake-session'] };
describe('Account settings contract', () => {
  it('preserves every new setting without keeping pending UI fields', () => {
    const value = { ...base, chatgptAccountId: 'a', reasoningEffort: 'extended', geminiAccountIndex: 0, geminiBuildLabel: 'build', geminiModelHeader: '[1]', allowGuestFallback: false, temperature: 0, maxTokens: 30000, presencePenalty: -1, frequencyPenalty: 0, translationChunkChars: 1200,
      taskConversations: { translation: { mode: 'reuse' as const, projectId: 'p', conversationId: 'translation' }, glossary: { conversationId: 'glossary', responseId: 'r' }, review: { conversationId: 'review', choiceId: 'c' } }, _pendingAttachments: ['private'] };
    const clean = pickAccountSettings(value);
    expect(clean.temperature).toBe(0); expect(clean.geminiAccountIndex).toBe(0); expect(clean.allowGuestFallback).toBe(false);
    expect(clean.taskConversations).toEqual(value.taskConversations); expect(clean).not.toHaveProperty('_pendingAttachments'); expect(clean).not.toHaveProperty('apiKeys');
    clean.taskConversations!.translation!.conversationId = 'changed'; expect(value.taskConversations.translation.conversationId).toBe('translation');
  });
  it('classifies by ID and keeps custom GPT/DeepSeek models independent', () => {
    expect(isChatGPTProvider({ providerId: 'custom' })).toBe(false); expect(isAccountProvider({ providerId: 'openrouter' })).toBe(false);
    expect(isDeepSeekWorkerProvider({ providerId: 'deepseek_worker_1' })).toBe(true); expect(isAccountProvider({ providerId: 'gemini_web_1' })).toBe(true);
  });
  it('requires conversation ID only for reuse mode', () => {
    expect(() => validateAccountSettings({ ...base, taskConversations: { review: { mode: 'reuse' } } })).toThrow(/المراجعة/);
    expect(() => validateAccountSettings({ ...base, taskConversations: { review: { mode: 'new' } } })).not.toThrow();
  });
  it.each([['translationChunkChars', 499], ['geminiAccountIndex', 1.5], ['maxTokens', 0], ['temperature', 3], ['presencePenalty', -3], ['frequencyPenalty', NaN]])('rejects invalid numeric field %s', (key, value) => {
    expect(() => validateAccountSettings({ ...base, [key]: value })).toThrow();
  });
  it('validates the editable DeepSeek Worker URL', () => {
    expect(() => validateAccountSettings({ ...base, providerId: 'deepseek_worker_1', baseUrl: 'http://insecure.invalid' })).toThrow(/HTTPS/);
    expect(() => validateAccountSettings({ ...base, providerId: 'deepseek_worker_1', baseUrl: 'https://deepseek-pow.contact-3mh.workers.dev' })).not.toThrow();
  });
  it('accepts zero-valued options and verified JSON model headers', () => {
    expect(() => validateAccountSettings({ ...base, temperature: 0, geminiAccountIndex: 0, presencePenalty: 0, frequencyPenalty: 0, geminiModelHeader: '[1,null,"model"]' })).not.toThrow();
    expect(() => validateAccountSettings({ ...base, geminiModelHeader: '{"invalid":true}' })).toThrow(/JSON/);
  });
});
