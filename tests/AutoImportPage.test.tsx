import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const data = vi.hoisted(() => {
  const novelId = 'b'.repeat(24);
  const job = { id: 'a'.repeat(24), kind: 'scrape', status: 'completed', novelId, total: 1, completed: 1 };
  const settings = { enabled: false, intervalMinutes: 60, inProgress: false };
  return {
    novelId, job, settings, watchlist: vi.fn(), logs: vi.fn(),
    service: {
      list: vi.fn().mockResolvedValue([]),
      events: vi.fn().mockResolvedValue([]),
      scrape: vi.fn().mockResolvedValue(job),
      watchSchedule: vi.fn().mockResolvedValue(settings),
      saveWatchSchedule: vi.fn().mockResolvedValue({ ...settings, enabled: true }),
      refreshWatched: vi.fn().mockResolvedValue(job),
      refreshWatchlist: vi.fn().mockResolvedValue({ queued: true }),
    },
  };
});
vi.mock('../src/services/automation', () => ({ automationService: data.service }));
vi.mock('../src/services/translator', () => ({ translatorService: {
  getWatchlist: data.watchlist,
} }));
vi.mock('../src/services/admin', () => ({ adminService: { getLogs: data.logs } }));
import { AutoImportPage } from '../src/screens/dashboard/AdminPages';

afterEach(cleanup);
beforeEach(() => {
  data.watchlist.mockResolvedValue([{ _id: data.novelId, title: 'Watched novel', sourceUrl: 'https://novelfire.net/book' }]);
  data.logs.mockResolvedValue([]);
  data.service.list.mockResolvedValue([]);
  data.service.events.mockResolvedValue([]);
  data.service.scrape.mockResolvedValue(data.job);
  data.service.watchSchedule.mockResolvedValue(data.settings);
  data.service.saveWatchSchedule.mockResolvedValue({ ...data.settings, enabled: true });
  data.service.refreshWatched.mockResolvedValue(data.job);
  data.service.refreshWatchlist.mockResolvedValue({ queued: true });
});

it('keeps the import controls and sends them to the durable backend', async () => {
  render(<AutoImportPage />);
  await screen.findByText('كونسول السحب الحي');
  const source = screen.getByPlaceholderText('https://m.wfxs.tw/xiaoshuo/2309384/');
  const range = screen.getByPlaceholderText(/نطاق الفصول/);
  const start = screen.getByRole('button', { name: 'بدء السحب' });
  await userEvent.type(source, 'https://novelfire.net/book');
  expect((range as HTMLInputElement).value).toBe('');
  await userEvent.click(start);
  await waitFor(() => expect(data.service.scrape).toHaveBeenCalledWith('https://novelfire.net/book', '', expect.any(String)));
  const novel = await screen.findByRole('link', { name: 'إدارة فصول الرواية' });
  expect(novel.getAttribute('href')).toBe('/dashboard/chapters/' + data.novelId);
  await userEvent.type(range, '10-!');
  await userEvent.click(start);
  await waitFor(() => expect(data.service.scrape).toHaveBeenLastCalledWith('https://novelfire.net/book', '10-!', expect.any(String)));
  await userEvent.click(screen.getByRole('button', { name: 'فحص تحديث' }));
  await waitFor(() => expect(data.service.refreshWatched).toHaveBeenCalledWith(data.novelId, expect.any(String)));
  await userEvent.click(screen.getByRole('button', { name: /تحديث كل المتبعة/ }));
  await waitFor(() => expect(data.service.refreshWatchlist).toHaveBeenCalled());
  await userEvent.click(screen.getByRole('checkbox', { name: 'مفعّل' }));
  await waitFor(() => expect(data.service.saveWatchSchedule).toHaveBeenCalledWith(true, 60));
});
