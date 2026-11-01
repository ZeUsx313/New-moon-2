import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const service = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), chapters: vi.fn(), create: vi.fn(), control: vi.fn() }));
vi.mock('../src/services/automation', () => ({ automationService: service }));
vi.mock('../src/services/translator', () => ({ translatorService: { getTranslatorNovels: vi.fn().mockResolvedValue([]) } }));
vi.mock('../src/screens/dashboard/shared', () => ({ PageHead: ({ title }: { title: string }) => <h1>{title}</h1>, btnGhost: '', btnPrimary: '', inputCls: '' }));
import AutomationPage from '../src/screens/dashboard/AutomationPage';
const job = { id: 'a'.repeat(24), kind: 'scrape', status: 'queued', total: 300, completed: 80, remaining: 220, retries: 3, attempts: 0 };
beforeEach(() => { vi.stubEnv('VITE_DURABLE_JOBS', 'true'); service.list.mockResolvedValue([job]); service.get.mockResolvedValue(job); service.chapters.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('reads persisted progress after remount and pauses through the API', async () => {
  service.control.mockResolvedValue({ ...job, status: 'paused' });
  const first = render(<AutomationPage />);
  await userEvent.click(await screen.findByRole('button', { name: /80 \/ 300/ }));
  expect(await screen.findByText('حُفظ 80 من 300 فصلًا — المتبقي 220')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'إيقاف مؤقت' }));
  await waitFor(() => expect(service.control).toHaveBeenCalledWith(job.id, 'pause'));
  first.unmount(); render(<AutomationPage />);
  await screen.findByRole('button', { name: /80 \/ 300/ });
  expect(service.list).toHaveBeenCalledTimes(3);
});
it('retains the same creation key after a network failure', async () => {
  service.list.mockResolvedValue([]); service.create.mockRejectedValue(new Error('network'));
  render(<AutomationPage />);
  await userEvent.type(screen.getByLabelText('رابط الرواية'), 'https://novelfire.net/test');
  await userEvent.click(screen.getByRole('button', { name: 'إنشاء مهمة' }));
  await screen.findByRole('alert');
  await userEvent.click(screen.getByRole('button', { name: 'إنشاء مهمة' }));
  await waitFor(() => expect(service.create).toHaveBeenCalledTimes(2));
  expect(service.create.mock.calls[0][1]).toEqual(service.create.mock.calls[1][1]);
});
it('does not request jobs before the feature is enabled', () => {
  vi.stubEnv('VITE_DURABLE_JOBS', 'false'); render(<AutomationPage />);
  expect(service.list).not.toHaveBeenCalled();
});
