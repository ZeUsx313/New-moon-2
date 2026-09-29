import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCcw } from 'lucide-react';
import { CommentSection } from '../../../components/CommentSection';
import { commentService, Comment } from '../../../services/comment';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
  chapterId: number;
  onAddComment: (content: string) => Promise<boolean>;
}

/**
 * Reader comments modal — now loads the REAL chapter comments instead of an
 * always-empty list.
 */
export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  novelId,
  chapterId,
  onAddComment,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await commentService.getComments(novelId, chapterId || undefined, 1, 20);
      setComments(res.comments || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'فشل جلب التعليقات');
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId]);

  // Load every time the modal opens (fresh counts) or the chapter changes
  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl rounded-t-2xl shadow-xl"
          style={{ maxHeight: '80vh' }}
          role="dialog"
          aria-modal="true"
          aria-label="تعليقات الفصل"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full" aria-label="إغلاق التعليقات">
              <X size={24} className="text-white" />
            </button>
            <h3 className="text-white font-bold">التعليقات</h3>
            <button onClick={load} className="p-1.5 hover:bg-white/10 rounded-full" aria-label="تحديث التعليقات" title="تحديث">
              <RefreshCcw size={16} className="text-white/60" />
            </button>
          </div>
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            {error ? (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm mb-3">{error}</p>
                <button
                  onClick={load}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/80 transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <CommentSection
                novelId={novelId}
                comments={comments}
                loading={loading}
                onAddComment={async (content) => {
                  const ok = await onAddComment(content);
                  if (ok) load(); // refresh list + counts after posting
                  return ok;
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
