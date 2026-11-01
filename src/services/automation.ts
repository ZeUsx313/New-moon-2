import { http } from '../lib/http';
export type JobKind = 'scrape' | 'smart_translate' | 'pure_translate' | 'glossary_extract';
export interface AutomationJob {
  id: string; title?: string; workerClass?: 'function' | 'long'; kind: JobKind; status: string; total: number; completed: number; remaining: number;
  attempts: number; retries: number; lastError?: string; blockedCode?: string;
  currentChapter?: number; stage?: string; nextRunAt?: string; ratePerMinute?: number;
}
export interface ChapterProgress { _id: string; number: number; stage: string; state: string; unit: number; units: number; extractionUnit?: number; code?: string; }
export interface JobInput { kind: JobKind; sourceUrl?: string; novelId?: string; startChapter: number; endChapter: number; sourceSelection?: 'verified_original' | 'current_content'; }
export const automationService = {
  list: (before?: string) => http.get<AutomationJob[]>(`/api/automation/jobs${before ? `?before=${encodeURIComponent(before)}` : ''}`, { auth: true }),
  get: (id: string) => http.get<AutomationJob>(`/api/automation/jobs/${id}`, { auth: true }),
  chapters: (id: string, after?: string) => http.get<ChapterProgress[]>(`/api/automation/jobs/${id}/chapters${after ? `?after=${encodeURIComponent(after)}` : ''}`, { auth: true }),
  create: (input: JobInput, key: string) => http.post<AutomationJob>('/api/automation/jobs', input, { auth: true, retries: 0, headers: { 'Idempotency-Key': key } }),
  control: (id: string, action: 'pause' | 'resume' | 'cancel') => http.post<AutomationJob>(`/api/automation/jobs/${id}/${action}`, {}, { auth: true, retries: 0 }),
};
