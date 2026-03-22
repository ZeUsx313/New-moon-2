export const formatRelativeTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'الآن';
  if (diffHour < 1) return `منذ ${diffMin} دقيقة`;
  if (diffDay < 1) return `منذ ${diffHour} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};