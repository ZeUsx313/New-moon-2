import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import AccountProviderControls from '../src/components/providers/AccountProviderControls';
import { accountProviderService } from '../src/services/accountProviders';
import type { ProviderModel, TranslationProvider } from '../src/lib/translationProviders';
vi.mock('../src/services/accountProviders', () => ({ accountProviderService: { projects: vi.fn(), chats: vi.fn(), models: vi.fn(), conversation: vi.fn(), upload: vi.fn(), send: vi.fn() } }));
const mock = vi.mocked(accountProviderService);
let latest: TranslationProvider;
const onModels = vi.fn();
function Harness({ initial = {} }: { initial?: Partial<TranslationProvider> }) {
  const [provider, setProvider] = useState<TranslationProvider>({ providerId: 'chatgpt_1', name: 'GPT', apiKeys: ['fake-token'], taskConversations: {}, ...initial });
  latest = provider;
  return <AccountProviderControls provider={provider}
    onChange={(field, value) => setProvider(p => ({ ...p, [field]: value }))}
    onTaskChange={(purpose, patch) => setProvider(p => ({ ...p, taskConversations: { ...p.taskConversations, [purpose]: { ...p.taskConversations?.[purpose], ...patch } } }))}
    onModels={onModels} />;
}
beforeEach(() => { vi.clearAllMocks(); });
it('keeps independent translation/glossary/review conversation selections', async () => {
  const user = userEvent.setup(); render(<Harness />);
  await user.type(screen.getByLabelText('معرّف محادثة الترجمة'), 'translation');
  await user.click(screen.getByRole('button', { name: 'المصطلحات' })); await user.type(screen.getByLabelText('معرّف محادثة المصطلحات'), 'glossary');
  await user.click(screen.getByRole('button', { name: 'المراجعة' })); await user.type(screen.getByLabelText('معرّف محادثة المراجعة'), 'review');
  expect(latest.taskConversations?.translation?.conversationId).toBe('translation'); expect(latest.taskConversations?.glossary?.conversationId).toBe('glossary'); expect(latest.taskConversations?.review?.conversationId).toBe('review');
});
it('browses project chats and preserves project even if inspection omits metadata', async () => {
  mock.projects.mockResolvedValue({ items: [{ id: 'p', name: 'Novel', chats: [{ id: 'c', title: 'Novel translation' }] }] });
  mock.conversation.mockResolvedValue({ id: 'c' }); const user = userEvent.setup(); render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'جلب المشاريع' })); await screen.findByRole('option', { name: 'Novel' });
  await user.selectOptions(screen.getByLabelText('مشروع الترجمة', { exact: false, selector: 'select' }), 'p');
  await user.click(screen.getByRole('button', { name: 'Novel translation' }));
  await waitFor(() => expect(latest.taskConversations?.translation).toMatchObject({ projectId: 'p', conversationId: 'c', mode: 'reuse' }));
});
it('creates a new conversation in chosen project and captures returned IDs', async () => {
  mock.send.mockResolvedValue({ reply: 'تم إنشاء المحادثة.', context: { conversationId: 'new-chat', parentMessageId: 'parent' } });
  const user = userEvent.setup(); render(<Harness initial={{ taskConversations: { translation: { projectId: 'p', mode: 'per_job' } } }} />);
  await user.type(screen.getByLabelText('رسالة التجربة'), 'Start translation'); await user.click(screen.getByRole('button', { name: 'إنشاء محادثة في المشروع' }));
  await screen.findByText('تم إنشاء المحادثة.'); expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ taskConversations: { translation: { projectId: 'p', mode: 'per_job' } } }), 'translation', 'Start translation', true, []);
  expect(latest.taskConversations?.translation).toMatchObject({ projectId: 'p', conversationId: 'new-chat', mode: 'reuse' });
});
it('clears stale conversation when manually changing project', async () => {
  render(<Harness initial={{ taskConversations: { translation: { projectId: 'p', conversationId: 'old', mode: 'reuse' } } }} />);
  fireEvent.change(screen.getByLabelText('معرّف المشروع يدويًا'), { target: { value: 'different' } });
  expect(latest.taskConversations?.translation).toMatchObject({ projectId: 'different', conversationId: '', mode: 'per_job' });
});
it('loads account models without using generic OpenAI model endpoint', async () => {
  const models: ProviderModel[] = [{ modelId: 'gpt-test', modelName: 'GPT Test' }]; mock.models.mockResolvedValue({ models });
  render(<Harness />); await userEvent.click(screen.getByRole('button', { name: 'جلب نماذج الحساب' })); await waitFor(() => expect(onModels).toHaveBeenCalledWith(models));
});
it('supports Gemini account 0, response/choice IDs, guest opt-in, and explains thinking limits', async () => {
  const user = userEvent.setup(); render(<Harness initial={{ providerId: 'gemini_web_1' }} />);
  fireEvent.change(screen.getByLabelText('رقم حساب Google', { exact: false, selector: 'input' }), { target: { value: '0' } });
  await user.type(screen.getByLabelText('Response ID'), 'response'); await user.type(screen.getByLabelText('Choice ID'), 'choice');
  await user.click(screen.getByRole('checkbox', { name: 'السماح بوضع الضيف عند فشل الحساب' }));
  expect(latest.geminiAccountIndex).toBe(0); expect(latest.allowGuestFallback).toBe(true); expect(latest.taskConversations?.translation?.responseId).toBe('response');
  expect(screen.queryByRole('button', { name: 'جلب المشاريع' })).toBeNull(); expect(screen.getByText(/لا يثبت التحكم بالتفكير/)).toBeTruthy();
});
it('sets DeepSeek Worker zero sampling values and reasoning/search flags', async () => {
  render(<Harness initial={{ providerId: 'deepseek_worker_1', thinkingEnabled: false, searchEnabled: false }} />);
  fireEvent.change(screen.getByLabelText('Temperature', { exact: false, selector: 'input' }), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Max tokens', { exact: false, selector: 'input' }), { target: { value: '30000' } });
  await userEvent.click(screen.getByRole('checkbox', { name: 'تفعيل التفكير' }));
  expect(latest.temperature).toBe(0); expect(latest.maxTokens).toBe(30000); expect(latest.thinkingEnabled).toBe(true); expect(latest.searchEnabled).toBe(false);
});
it('uploads an attachment, sends its real metadata, and clears it after success', async () => {
  mock.upload.mockResolvedValue({ attachment: { attachment: { id: 'file1', name: 'chapter.txt' } } });
  mock.send.mockResolvedValue({ reply: 'تم.', context: { conversationId: 'c' } }); const user = userEvent.setup(); render(<Harness />);
  await user.upload(screen.getByLabelText('اختيار صورة أو ملف'), new File(['chapter'], 'chapter.txt', { type: 'text/plain' }));
  await screen.findByText('chapter.txt'); await user.type(screen.getByLabelText('رسالة التجربة'), 'Read file');
  await user.click(screen.getByRole('button', { name: 'إرسال الرسالة' })); await screen.findByText('تم.');
  expect(mock.send.mock.calls[0][4][0].attachment?.id).toBe('file1'); expect(screen.queryByRole('list', { name: 'المرفقات المجهزة' })).toBeNull();
});
it('preserves conversation and pending attachment after provider failure', async () => {
  mock.send.mockRejectedValue(new Error('Provider HTTP 401')); render(<Harness initial={{ taskConversations: { translation: { conversationId: 'keep', mode: 'reuse' } } }} />);
  fireEvent.change(screen.getByLabelText('رسالة التجربة'), { target: { value: 'Hello' } }); await userEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' }));
  expect((await screen.findByRole('alert')).textContent).toContain('401'); expect(latest.taskConversations?.translation?.conversationId).toBe('keep');
});
it('does not send without credentials', async () => {
  render(<Harness initial={{ apiKeys: [] }} />); await userEvent.click(screen.getByRole('button', { name: 'جلب المشاريع' })); expect((await screen.findByRole('alert')).textContent).toContain('بيانات الحساب'); expect(mock.projects).not.toHaveBeenCalled();
});
it('disables edits during creation and prevents double submit', async () => {
  let resolve: (value: { reply: string; context: { conversationId: string } }) => void;
  mock.send.mockReturnValue(new Promise(done => { resolve = done; })); render(<Harness />);
  fireEvent.change(screen.getByLabelText('رسالة التجربة'), { target: { value: 'Hello' } }); const button = screen.getByRole('button', { name: 'إنشاء محادثة جديدة' });
  fireEvent.click(button); fireEvent.click(button); expect(mock.send).toHaveBeenCalledTimes(1); expect((button as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve!({ reply: 'Done', context: { conversationId: 'new' } }));
});
