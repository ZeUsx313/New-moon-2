import { http } from '../lib/http';
export type JobKind = 'scrape' | 'smart_translate' | 'pure_translate' | 'glossary_extract';
export interface AutomationJob {
  id: string; title?: string; novelId?: string; workerClass?: 'function' | 'long'; kind: JobKind; status: string; total: number; completed: number; remaining: number;
  attempts: number; retries: number; lastError?: string; blockedCode?: string; updatedAt?: string;
  currentChapter?: number; stage?: string; nextRunAt?: string; ratePerMinute?: number;
}
export interface ChapterProgress { _id: string; number: number; stage: string; state: string; unit: number; units: number; extractionUnit?: number; code?: string; }
export interface AutomationEvent { _id: string; chapter?: number; code: string; type?: string; createdAt: string; }
export interface WatchSchedule { enabled: boolean; intervalMinutes: number; inProgress: boolean; nextRunAt?: string; }
export interface JobInput { kind: JobKind; sourceUrl?: string; novelId?: string; startChapter: number; endChapter: number; chapters?: number[]; sourceSelection?: 'verified_original' | 'current_content'; }
export const automationService = {
  list: (before?: string) => http.get<AutomationJob[]>(`/api/automation/jobs${before ? `?before=${encodeURIComponent(before)}` : ''}`, { auth: true }),
  get: (id: string) => http.get<AutomationJob>(`/api/automation/jobs/${id}`, { auth: true }),
  chapters: (id: string, after?: string) => http.get<ChapterProgress[]>(`/api/automation/jobs/${id}/chapters${after ? `?after=${encodeURIComponent(after)}` : ''}`, { auth: true }),
  create: (input: JobInput, key: string) => http.post<AutomationJob>('/api/automation/jobs', input, { auth: true, retries: 0, headers: { 'Idempotency-Key': key } }),
  control: (id: string, action: 'pause' | 'resume' | 'cancel') => http.post<AutomationJob>(`/api/automation/jobs/${id}/${action}`, {}, { auth: true, retries: 0 }),
  scrape: (sourceUrl: string, chapterSpec: string, key: string) =>
    http.post<AutomationJob>('/api/automation/jobs', { kind: 'scrape', sourceUrl, chapterSpec, watchRequested: true }, { auth: true, retries: 0, headers: { 'Idempotency-Key': key } }),
  events: (id: string, after?: string) => http.get<AutomationEvent[]>(`/api/automation/jobs/${id}/events${after ? `?after=${encodeURIComponent(after)}` : ''}`, { auth: true }),
  watchSchedule: () => http.get<WatchSchedule>('/api/automation/watch-schedule', { auth: true }),
  saveWatchSchedule: (enabled: boolean, intervalMinutes: number) =>
    http.post<WatchSchedule>('/api/automation/watch-schedule', { enabled, intervalMinutes }, { auth: true, retries: 0 }),
  refreshWatched: (novelId: string, key: string) =>
    http.post<AutomationJob>('/api/automation/watch-refresh', { novelId }, { auth: true, retries: 0, headers: { 'Idempotency-Key': key } }),
  refreshWatchlist: () => http.post<{ queued: boolean }>('/api/automation/watch-refresh', {}, { auth: true, retries: 0 }),
};
