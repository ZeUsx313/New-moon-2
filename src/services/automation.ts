import { http } from '../lib/http';
export type JobKind = 'scrape' | 'smart_translate' | 'pure_translate' | 'glossary_extract';
export interface AutomationJob {
  id: string; title?: string; novelId?: string; workerClass?: 'function' | 'long'; kind: JobKind; status: string; total: number; completed: number; remaining: number;
  attempts: number; retries: number; lastError?: string; blockedCode?: string;
  currentChapter?: number; stage?: string; nextRunAt?: string; ratePerMinute?: number;
}
export interface ChapterProgress { _id: string; number: number; stage: string; state: string; unit: number; units: number; extractionUnit?: number; code?: string; }
export interface JobInput { kind: JobKind; sourceUrl?: string; novelId?: string; startChapter: number; endChapter: number; chapters?: number[]; sourceSelection?: 'verified_original' | 'current_content'; }
export function parseScrapeChapters(value: string): number[] {
  const chapters = new Set<number>();
  for (const entry of value.trim().split(/[,،]/)) {
    const range = entry.trim().match(/^([1-9]\d{0,6})(?:\s*-\s*([1-9]\d{0,6}))?$/);
    if (!range) throw new Error('حدد الفصول بأرقام، مثل 1 أو 1-10 أو 12,50.');
    const first = Number(range[1]), last = Number(range[2] ?? range[1]);
    if (last < first || last > 1_000_000 || last - first >= 2000) {
      throw new Error('أدخل نطاقًا صحيحًا من 1 إلى 2000 فصل لكل مهمة.');
    }
    for (let chapter = first; chapter <= last; chapter++) chapters.add(chapter);
    if (chapters.size > 2000) throw new Error('الحد لكل مهمة هو 2000 فصل.');
  }
  return [...chapters].sort((a, b) => a - b);
}
export const automationService = {
  list: (before?: string) => http.get<AutomationJob[]>(`/api/automation/jobs${before ? `?before=${encodeURIComponent(before)}` : ''}`, { auth: true }),
  get: (id: string) => http.get<AutomationJob>(`/api/automation/jobs/${id}`, { auth: true }),
  chapters: (id: string, after?: string) => http.get<ChapterProgress[]>(`/api/automation/jobs/${id}/chapters${after ? `?after=${encodeURIComponent(after)}` : ''}`, { auth: true }),
  create: (input: JobInput, key: string) => http.post<AutomationJob>('/api/automation/jobs', input, { auth: true, retries: 0, headers: { 'Idempotency-Key': key } }),
  control: (id: string, action: 'pause' | 'resume' | 'cancel') => http.post<AutomationJob>(`/api/automation/jobs/${id}/${action}`, {}, { auth: true, retries: 0 }),
};
