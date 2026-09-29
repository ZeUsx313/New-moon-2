/**
 * Central HTTP layer for the whole site.
 * - Safe JSON parsing (HTML error pages / 204 / network failures never crash)
 * - Realistic ApiError with HTTP status + server message
 * - Timeout for every request
 * - Optional retry for idempotent GET requests
 * - Automatic Authorization header
 */
import { api } from '../services/api';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  auth?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Skip building a JSON body (FormData etc.) */
  rawBody?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function parseResponseBody(res: Response): Promise<any> {
  // 204 / empty body
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  // Non-JSON (HTML error page from a proxy, empty, etc.) — never blow up
  try {
    const text = await res.text();
    return text ? { _raw: text } : null;
  } catch {
    return null;
  }
}

function buildHeaders(opts: RequestOptions, isFormData: boolean): Record<string, string> {
  const headers: Record<string, string> = { ...opts.headers };
  // Don't set Content-Type for FormData — the browser sets the boundary
  if (!isFormData && !headers['Content-Type'] && opts.method && opts.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  if (opts.auth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const maxAttempts = Math.max(1, (options.retries ?? (method === 'GET' ? 2 : 0)) + 1);

  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

    try {
      const res = await fetch(path.startsWith('http') ? path : `${api.baseUrl}${path}`, {
        method,
        headers: buildHeaders(options, isFormData),
        body: options.body === undefined
          ? undefined
          : (isFormData || options.rawBody ? options.body : JSON.stringify(options.body)),
        signal: controller.signal,
      });

      const data = await parseResponseBody(res);

      if (!res.ok) {
        const serverMessage =
          (data && typeof data.message === 'string' && data.message) ||
          (res.status === 502 ? 'الخادم غير متاح حالياً، حاول بعد قليل' :
            res.status === 503 ? 'الخادم مشغول حالياً، حاول بعد قليل' :
            res.status === 429 ? 'طلبات كثيرة جداً، انتظر قليلاً ثم أعد المحاولة' :
            res.status === 401 ? 'انتهت صلاحية الجلسة، سجّل الدخول من جديد' :
            res.status === 403 ? 'لا تملك صلاحية لهذا الإجراء' :
            res.status === 404 ? 'العنصر المطلوب غير موجود' :
            `حدث خطأ (${res.status})`);
        throw new ApiError(serverMessage, res.status, data);
      }

      return data as T;
    } catch (err: any) {
      lastError = err;
      // Abort (timeout) → network error style message
      if (err?.name === 'AbortError') {
        lastError = new ApiError('انتهت مهلة الاتصال بالخادم، تحقق من الإنترنت وأعد المحاولة', 0);
      }
      // Don't retry client errors (4xx) — they won't succeed on retry
      if (lastError instanceof ApiError && lastError.status >= 400 && lastError.status < 500) break;
      if (attempt < maxAttempts - 1) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError('فشل الاتصال بالخادم', 0);
}

export const http = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
