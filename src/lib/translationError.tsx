import toast from 'react-hot-toast';
import { ApiError } from './http';

const jobPages: Record<string, string> = {
  smart_translate: '/dashboard/translation-jobs/',
  pure_translate: '/dashboard/pure-translate/jobs/',
  glossary_extract: '/dashboard/glossary-ai/jobs/',
};

const messages: Record<string, string> = {
  legacy_job_active: 'توجد مهمة ترجمة قديمة لهذه الرواية. افتحها من قائمة المهام لاستئنافها أو إيقافها.',
  legacy_worker_still_within_deadline: 'العامل السابق قد يكون ما زال ينفّذ الفصل الحالي. أعد المحاولة بعد انتهاء مهلة التنفيذ.',
  source_job_active: 'السحب جارٍ لهذه الرواية. ابدأ الترجمة بعد انتهاء مهمة السحب.',
  provider_missing: 'أضف مزوّد ترجمة في الإعدادات لبدء المهمة.',
  provider_model_missing: 'اختر نموذجًا لمزوّد الترجمة في الإعدادات.',
  novel_busy_or_idempotency_conflict: 'توجد مهمة قيد البدء لهذه الرواية. راجع قائمة المهام.',
};

export function showTranslationRequestError(error: unknown, fallback: string, navigate: (path: string) => void) {
  if (!(error instanceof ApiError)) return toast.error(fallback);
  const conflict = error.data?.code === 'novel_job_in_progress' && error.data.job;
  const route = conflict && jobPages[conflict.kind];
  if (route && typeof conflict.id === 'string' && /^[a-f\d]{24}$/i.test(conflict.id)) {
    return toast.error((item) => (
      <span>
        توجد مهمة لم تنتهِ لهذه الرواية.{' '}
        <button type="button" className="underline" onClick={() => {
          toast.dismiss(item.id);
          navigate(route + conflict.id);
        }}>فتح المهمة الحالية</button>
      </span>
    ), { duration: 9000 });
  }
  return toast.error(messages[error.data?.error] || error.message || fallback);
}
