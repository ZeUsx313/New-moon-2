import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useCleaner = (isAdmin: boolean) => {
  const [cleanerWords, setCleanerWords] = useState<string[]>([]);
  const [newCleanerWord, setNewCleanerWord] = useState('');
  const [cleanerEditingId, setCleanerEditingId] = useState<number | null>(null);
  const [cleaningLoading, setCleaningLoading] = useState(false);

  const fetchCleaner = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/cleaner');
      const data = await res.json();
      setCleanerWords(data);
    } catch (e) {}
  }, [isAdmin]);

  const executeCleaner = useCallback(async () => {
    if (!newCleanerWord.trim()) {
      toast.error('يرجى إدخال النص المراد حذفه');
      return;
    }
    if (!window.confirm('سيتم حذف أي فقرة أو نص مطابق لما أدخلته من جميع الفصول في السيرفر. هل أنت متأكد؟')) return;
    setCleaningLoading(true);
    try {
      const method = cleanerEditingId !== null ? 'PUT' : 'POST';
      const url = cleanerEditingId !== null ? `/api/admin/cleaner/${cleanerEditingId}` : '/api/admin/cleaner';
      const body = { word: newCleanerWord };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      if (cleanerEditingId !== null) setCleanerEditingId(null);
      setNewCleanerWord('');
      await fetchCleaner();
      toast.success('تم الحذف من جميع الفصول بنجاح');
      return true;
    } catch (e) {
      toast.error('فشل تنفيذ الحذف');
      return false;
    } finally {
      setCleaningLoading(false);
    }
  }, [newCleanerWord, cleanerEditingId, fetchCleaner]);

  const editCleaner = (word: string, idx: number) => {
    setNewCleanerWord(word);
    setCleanerEditingId(idx);
  };

  const deleteCleaner = async (word: string) => {
    if (!window.confirm('هل تريد إزالة هذا النص من القائمة؟')) return;
    try {
      await fetch(`/api/admin/cleaner/${encodeURIComponent(word)}`, { method: 'DELETE' });
      await fetchCleaner();
      if (newCleanerWord === word) {
        setNewCleanerWord('');
        setCleanerEditingId(null);
      }
      toast.success('تم الحذف من القائمة');
    } catch (e) {
      toast.error('فشل الحذف');
    }
  };

  return {
    cleanerWords,
    newCleanerWord,
    cleanerEditingId,
    cleaningLoading,
    setNewCleanerWord,
    setCleanerEditingId,
    fetchCleaner,
    executeCleaner,
    editCleaner,
    deleteCleaner,
  };
};