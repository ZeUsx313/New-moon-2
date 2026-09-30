/**
 * Site-wide helpers shared by all screens.
 */

/** Public site URL used for canonical/OG tags (falls back to the current origin). */
export const SITE_URL = 'https://moonnovel.vercel.app';

export const siteUrl = (path: string = '/'): string => {
  // Prefer the real origin when running in a browser so deployments on any
  // domain produce correct canonical/OG links.
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : SITE_URL;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

export const SITE_NAME = 'قمر الروايات';
export const SITE_TAGLINE = 'بوابتك لعالم الخيال';

/** Unified status pill styling (was inconsistent between Home and NovelPage).
 *  الهوية أبيض/أسود: مستمرة = حبر كامل، مكتملة = باهت، متوقفة = أحمر دلالي صارم. */
export const getStatusStyle = (status: string): string => {
  if (status === 'مستمرة') return 'bg-foreground/10 text-foreground border-foreground/25';
  if (status === 'مكتملة') return 'bg-foreground/5 text-foreground/60 border-foreground/15';
  if (status === 'منزّلة') return 'bg-foreground/8 text-foreground/80 border-foreground/20';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
};

/** Relative Arabic time formatting (shared). */
export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'الآن';
  if (diffHour < 1) return `منذ ${diffMin} دقيقة`;
  if (diffDay < 1) return `منذ ${diffHour} ساعة`;
  if (diffMonth < 1) return `منذ ${diffDay} يوم`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

export const isNewChapter = (date: Date | string): boolean => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / 3600000 < 24;
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
