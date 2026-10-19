import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TranslationSettingsPage } from '../src/screens/dashboard/AiPages';
import { translatorService } from '../src/services/translator';
import { accountProviderService } from '../src/services/accountProviders';
vi.mock('../src/services/translator', () => ({ translatorService: { getSettings: vi.fn(), saveSettings: vi.fn(), fetchProviderModels: vi.fn() } }));
vi.mock('../src/services/accountProviders', () => ({ accountProviderService: { connect: vi.fn() } }));
const service = vi.mocked(translatorService);
const initial = {
  customPrompt: 'translate completely', translatorExtractPrompt: 'terms only', translationProviders: [
    { providerId: 'chatgpt_1', name: 'My ChatGPT', apiKeys: ['test-session'], models: [{ modelId: 'auto', modelName: 'Auto' }], selectedModel: 'auto', chatgptAccountId: 'a', reasoningEffort: 'extended', translationChunkChars: 1800, taskConversations: { translation: { mode: 'reuse', projectId: 'p', conversationId: 'translation' }, glossary: { mode: 'reuse', projectId: 'p', conversationId: 'glossary' }, review: { mode: 'reuse', projectId: 'p', conversationId: 'review' } } },
    { providerId: 'gemini_web_1', name: 'Google', apiKeys: ['__Secure-1PSID=fake; __Secure-1PSIDTS=fake'], models: [{ modelId: 'gemini-web', modelName: 'Gemini' }], geminiParagraphMode: false, geminiAccountIndex: 0, geminiModelHeader: '[1]', geminiBuildLabel: 'build', allowGuestFallback: false, taskConversations: { review: { mode: 'reuse', conversationId: 'gem-c', responseId: 'r', choiceId: 'choice' } } },
    { providerId: 'deepseek_worker_1', name: 'Worker', apiKeys: ['fake-ds'], models: [{ modelId: 'deepseek-chat', modelName: 'DS' }], baseUrl: 'https://deepseek-pow.contact-3mh.workers.dev', temperature: 0, maxTokens: 30000, presencePenalty: -1, frequencyPenalty: 0, thinkingEnabled: true, searchEnabled: false },
  ],
};
beforeEach(() => { vi.clearAllMocks(); service.getSettings.mockResolvedValue(structuredClone(initial)); service.saveSettings.mockResolvedValue({ success: true }); });
const mount = () => render(<MemoryRouter><TranslationSettingsPage /></MemoryRouter>);
it('round-trips all account options and independent conversations without dropping them', async () => {
  mount(); await screen.findByRole('button', { name: /My ChatGPT/ }); await userEvent.click(screen.getAllByRole('button', { name: 'حفظ الإعدادات' })[0]);
  await waitFor(() => expect(service.saveSettings).toHaveBeenCalledTimes(1)); const saved = service.saveSettings.mock.calls[0][0];
  expect(saved.customPrompt).toBe(initial.customPrompt); expect(saved.translatorExtractPrompt).toBe(initial.translatorExtractPrompt);
  const [gpt, gemini, worker] = saved.translationProviders;
  expect(gpt.taskConversations).toEqual(initial.translationProviders[0].taskConversations); expect(gpt.reasoningEffort).toBe('extended'); expect(gpt.translationChunkChars).toBe(1800);
  expect(gemini.geminiParagraphMode).toBe(false); expect(gemini.geminiAccountIndex).toBe(0); expect(gemini.allowGuestFallback).toBe(false); expect(gemini.geminiBuildLabel).toBe('build'); expect(gemini.geminiModelHeader).toBe('[1]');
  expect(worker.temperature).toBe(0); expect(worker.maxTokens).toBe(30000); expect(worker.searchEnabled).toBe(false); expect(worker.presencePenalty).toBe(-1);
});
it('adds new account templates with correct defaults', async () => {
  service.getSettings.mockResolvedValue({ translationProviders: [] }); mount(); await screen.findAllByRole('button', { name: 'حفظ الإعدادات' });
  await userEvent.click(screen.getByRole('button', { name: 'إضافة مزوّد جديد' })); await userEvent.click(screen.getByRole('button', { name: /ChatGPT Android/ }));
  await userEvent.click(screen.getAllByRole('button', { name: 'حفظ الإعدادات' })[0]); await waitFor(() => expect(service.saveSettings).toHaveBeenCalled());
  expect(service.saveSettings.mock.calls[0][0].translationProviders[0]).toMatchObject({ selectedModel: 'auto', reasoningEffort: 'auto', translationChunkChars: 2400 });
});
it('preserves fetched account models and model selection together', async () => {
  vi.mocked(accountProviderService.connect).mockResolvedValue({ profile: { name: 'ChatGPT' }, models: [{ modelId: 'gpt-new', modelName: 'GPT New' }], projects: { items: [] }, chats: { items: [] }, capabilities: { projects: true, chats: true, attachments: true } });
  mount(); await userEvent.click(await screen.findByRole('button', { name: /My ChatGPT/ }));
  await userEvent.click(screen.getByRole('button', { name: 'ربط الحساب وجلب الخيارات' })); await screen.findByRole('option', { name: 'GPT New' });
  await userEvent.click(screen.getAllByRole('button', { name: 'حفظ الإعدادات' })[0]); await waitFor(() => expect(service.saveSettings).toHaveBeenCalled());
  expect(service.saveSettings.mock.calls[0][0].translationProviders[0]).toMatchObject({ selectedModel: 'gpt-new', models: [{ modelId: 'gpt-new', modelName: 'GPT New' }] });
});
it('rejects invalid stored reuse configuration without asking for a manual identifier', async () => {
  const invalid = structuredClone(initial); invalid.translationProviders[0].taskConversations!.translation!.conversationId = '';
  service.getSettings.mockResolvedValue(invalid); mount(); await screen.findByRole('button', { name: /My ChatGPT/ });
  await userEvent.click(screen.getAllByRole('button', { name: 'حفظ الإعدادات' })[0]); expect(service.saveSettings).not.toHaveBeenCalled();
});
it('Worker panel does not expose Android expert/POW controls', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: /Worker/ })); expect(screen.queryByText('وضع مزوّد المحادثة')).toBeNull(); expect(screen.queryByText('مزود POW')).toBeNull(); expect(screen.queryByRole('spinbutton')).toBeNull(); expect(screen.queryByPlaceholderText('modelId')).toBeNull();
});
