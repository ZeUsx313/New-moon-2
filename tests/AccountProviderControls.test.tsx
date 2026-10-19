import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import AccountProviderControls from '../src/components/providers/AccountProviderControls';
import { accountProviderService, type AccountCatalog } from '../src/services/accountProviders';
import type { TranslationProvider } from '../src/lib/translationProviders';
vi.mock('../src/services/accountProviders', () => ({ accountProviderService: { connect: vi.fn(), projectChats: vi.fn(), projects: vi.fn(), chats: vi.fn(), conversation: vi.fn(), upload: vi.fn(), send: vi.fn() } }));
const mock = vi.mocked(accountProviderService);
let latest: TranslationProvider;
const onModels = vi.fn();
const catalog: AccountCatalog = { profile: { name: 'Test Account' }, models: [{ modelId: 'gpt-test', modelName: 'GPT Test' }], projects: { items: [{ id: 'p', name: 'Novel', chats: [] }] }, chats: { items: [{ id: 'a', title: 'Translation chat' }, { id: 'b', title: 'Glossary chat' }, { id: 'c', title: 'Review chat' }], total: 3 }, capabilities: { projects: true, chats: true, attachments: true } };
function Harness({ initial = {} }: { initial?: Partial<TranslationProvider> }) {
  const [provider, setProvider] = useState<TranslationProvider>({ providerId: 'chatgpt_1', name: 'GPT', apiKeys: ['fake-token'], taskConversations: {}, ...initial }); latest = provider;
  return <AccountProviderControls provider={provider} onChange={(field, value) => setProvider(p => ({ ...p, [field]: value }))}
    onTaskChange={(purpose, patch) => setProvider(p => ({ ...p, taskConversations: { ...p.taskConversations, [purpose]: { ...p.taskConversations?.[purpose], ...patch } } }))} onModels={onModels} />;
}
async function connect() { await userEvent.click(screen.getByRole('button', { name: 'ربط الحساب وجلب الخيارات' })); await screen.findByText('الحساب المتصل: Test Account'); }
beforeEach(() => { vi.resetAllMocks(); mock.connect.mockResolvedValue(structuredClone(catalog)); mock.conversation.mockImplementation(async (_, id) => ({ id })); mock.projectChats.mockResolvedValue({ items: [{ id: 'project-chat', title: 'Sixth project chat' }] }); });
it('requires only account credentials and has no manual identifier/settings inputs', async () => {
  render(<Harness />); expect(screen.queryByRole('textbox')).toBeNull(); expect(screen.queryByRole('spinbutton')).toBeNull();
  await connect(); expect(onModels).toHaveBeenCalledWith(catalog.models); expect(screen.queryByLabelText('معرّف حساب ChatGPT')).toBeNull(); expect(screen.queryByPlaceholderText('modelId')).toBeNull();
});
it('keeps independent translation/glossary/review selections fetched from account', async () => {
  render(<Harness />); await connect();
  await userEvent.selectOptions(screen.getByLabelText('محادثة الترجمة'), 'a');
  await userEvent.click(screen.getByRole('button', { name: 'المصطلحات' })); await userEvent.selectOptions(screen.getByLabelText('محادثة المصطلحات'), 'b');
  await userEvent.click(screen.getByRole('button', { name: 'المراجعة' })); await userEvent.selectOptions(screen.getByLabelText('محادثة المراجعة'), 'c');
  await waitFor(() => expect(latest.taskConversations?.review?.conversationId).toBe('c'));
  expect(latest.taskConversations?.translation?.conversationId).toBe('a'); expect(latest.taskConversations?.glossary?.conversationId).toBe('b');
});
it('selecting project automatically fetches its own chats, clearing the old selection', async () => {
  render(<Harness initial={{ taskConversations: { translation: { conversationId: 'old', mode: 'reuse' } } }} />); await connect();
  await userEvent.selectOptions(screen.getByLabelText('مشروع الترجمة'), 'p'); await screen.findByRole('option', { name: 'Sixth project chat' });
  expect(mock.projectChats).toHaveBeenCalledWith(expect.anything(), 'p', undefined); expect(latest.taskConversations?.translation?.conversationId).toBe('');
  await userEvent.selectOptions(screen.getByLabelText('محادثة الترجمة'), 'project-chat');
  await waitFor(() => expect(latest.taskConversations?.translation).toMatchObject({ projectId: 'p', conversationId: 'project-chat', mode: 'reuse' }));
});
it('creates a conversation in selected project without typing a starter prompt', async () => {
  mock.send.mockResolvedValue({ reply: 'تم إنشاء المحادثة.', context: { conversationId: 'new-chat' } });
  render(<Harness initial={{ taskConversations: { translation: { projectId: 'p' } } }} />); await connect();
  await userEvent.click(screen.getByRole('button', { name: 'إنشاء محادثة الترجمة في المشروع' }));
  await screen.findByText('تم إنشاء المحادثة.'); expect(mock.send).toHaveBeenCalledWith(expect.anything(), 'translation', '', true, []);
  expect(latest.taskConversations?.translation).toMatchObject({ projectId: 'p', conversationId: 'new-chat', mode: 'reuse' });
});
it('fetches Gemini account index and continuation IDs with no manual fields', async () => {
  mock.connect.mockResolvedValue({ ...catalog, capabilities: { ...catalog.capabilities, projects: false }, detectedSettings: { geminiAccountIndex: 0 } });
  mock.conversation.mockResolvedValue({ id: 'a', responseId: 'r', choiceId: 'choice' }); render(<Harness initial={{ providerId: 'gemini_web_1' }} />); await connect();
  await userEvent.selectOptions(screen.getByLabelText('محادثة الترجمة'), 'a');
  await waitFor(() => expect(latest.taskConversations?.translation?.choiceId).toBe('choice')); expect(latest.geminiAccountIndex).toBe(0);
  expect(screen.queryByLabelText('Response ID')).toBeNull(); expect(screen.queryByLabelText('مشروع الترجمة')).toBeNull();
});
it('Worker has account chats and simple thinking/search choices without URL or numeric fields', async () => {
  mock.connect.mockResolvedValue({ ...catalog, capabilities: { projects: false, chats: true, attachments: false } });
  render(<Harness initial={{ providerId: 'deepseek_worker_1', searchEnabled: false }} />); await connect();
  await userEvent.click(screen.getByRole('checkbox', { name: 'تفعيل التفكير' })); expect(latest.thinkingEnabled).toBe(true); expect(latest.searchEnabled).toBe(false);
  expect(screen.queryByRole('spinbutton')).toBeNull(); expect(screen.queryByLabelText('رابط خدمة DeepSeek 3MH')).toBeNull();
});
it('uploads real metadata and clears attachments only after successful send', async () => {
  mock.upload.mockResolvedValue({ attachment: { attachment: { id: 'file1', name: 'chapter.txt' } } }); mock.send.mockResolvedValue({ reply: 'تم.', context: { conversationId: 'a' } });
  render(<Harness />); await connect(); await userEvent.click(screen.getByText('تجربة المحادثة والمرفقات (اختياري)'));
  await userEvent.upload(screen.getByLabelText('اختيار صورة أو ملف'), new File(['chapter'], 'chapter.txt', { type: 'text/plain' })); await screen.findByText('chapter.txt');
  await userEvent.type(screen.getByLabelText('رسالة التجربة'), 'Read file'); await userEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' })); await screen.findByText('تم.');
  expect(mock.send.mock.calls[0][4][0].attachment?.id).toBe('file1'); expect(screen.queryByRole('list', { name: 'المرفقات المجهزة' })).toBeNull();
});
it('shows discovery errors and allows retry without changing saved selections', async () => {
  mock.connect.mockRejectedValueOnce(new Error('رفض المزوّد بيانات الحساب')); render(<Harness initial={{ taskConversations: { translation: { conversationId: 'keep', mode: 'reuse' } } }} />);
  await userEvent.click(screen.getByRole('button', { name: 'ربط الحساب وجلب الخيارات' })); expect((await screen.findByRole('alert')).textContent).toContain('بيانات الحساب'); expect(latest.taskConversations?.translation?.conversationId).toBe('keep');
  await connect(); expect(mock.connect).toHaveBeenCalledTimes(2);
});
it('does not send without credentials', async () => {
  render(<Harness initial={{ apiKeys: [] }} />); await userEvent.click(screen.getByRole('button', { name: 'ربط الحساب وجلب الخيارات' })); expect((await screen.findByRole('alert')).textContent).toContain('الصق'); expect(mock.connect).not.toHaveBeenCalled();
});
it('prevents double submit during one-click creation', async () => {
  let resolve: (value: { reply: string; context: { conversationId: string } }) => void;
  mock.send.mockReturnValue(new Promise(done => { resolve = done; })); render(<Harness />); await connect();
  const button = screen.getByRole('button', { name: 'إنشاء محادثة الترجمة' }); fireEvent.click(button); fireEvent.click(button); expect(mock.send).toHaveBeenCalledTimes(1); expect(button.closest('fieldset')?.disabled).toBe(true);
  await act(async () => resolve!({ reply: 'Done', context: { conversationId: 'new' } }));
});
it('clears stale manual account/thinking overrides and offers only advertised reasoning levels', async () => {
  mock.connect.mockResolvedValue({ ...catalog, models: [{ modelId: 'gpt-test', modelName: 'GPT Test', reasoningEfforts: ['low', 'high'] }] });
  render(<Harness initial={{ chatgptAccountId: 'wrong-manual-account', selectedModel: 'gpt-test', reasoningEffort: 'invented', taskConversations: { translation: { reasoningEffort: 'invented' } } }} />);
  await connect(); expect(latest.chatgptAccountId).toBe(''); expect(latest.reasoningEffort).toBe('auto'); expect(latest.taskConversations?.translation?.reasoningEffort).toBe('auto');
  await userEvent.selectOptions(screen.getByLabelText('تفكير الترجمة'), 'high'); expect(latest.taskConversations?.translation?.reasoningEffort).toBe('high');
  expect(screen.queryByRole('option', { name: 'invented' })).toBeNull();
});
it('offers a Gemini-only paragraph mode toggle before connecting and allows restoring normal full-chapter mode', async () => {
  const panel = render(<Harness initial={{ providerId: 'gemini_web_1' }} />);
  const toggle = screen.getByRole('checkbox', { name: 'تقسيم الفصل وفحص الفقرات' });
  expect((toggle as HTMLInputElement).checked).toBe(true);
  await userEvent.click(toggle); expect(latest.geminiParagraphMode).toBe(false);
  await userEvent.click(toggle); expect(latest.geminiParagraphMode).toBe(true);
  panel.unmount(); render(<Harness initial={{ providerId: 'chatgpt_1' }} />);
  expect(screen.queryByRole('checkbox', { name: 'تقسيم الفصل وفحص الفقرات' })).toBeNull();
});
it('shows saved Gemini paragraph mode disabled without changing it on connection', async () => {
  render(<Harness initial={{ providerId: 'gemini_web_1', geminiParagraphMode: false }} />); await connect();
  expect((screen.getByRole('checkbox', { name: 'تقسيم الفصل وفحص الفقرات' }) as HTMLInputElement).checked).toBe(false);
  expect(latest.geminiParagraphMode).toBe(false);
});
