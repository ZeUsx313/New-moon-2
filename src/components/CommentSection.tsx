import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ThumbsUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { commentService, Comment } from '../services/comment';
import { Skeleton } from './Skeleton';
import SafeImage from './SafeImage';
import toast from 'react-hot-toast';

interface CommentSectionProps {
  novelId: string;
  comments: Comment[];
  loading: boolean;
  /** Return true when the comment was actually saved (keeps typed text on failure) */
  onAddComment: (content: string) => Promise<boolean>;
  /** Optional: called after a successful like so parents can refresh counts */
  onLikeDone?: () => void;
}

const AVATAR_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#2a2a2a"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v1H4z"/></svg>`
  );

export const CommentSection: React.FC<CommentSectionProps> = ({
  novelId,
  comments,
  loading,
  onAddComment,
  onLikeDone,
}) => {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { isAuthenticated, openAuthModal } = useAuth();

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    const content = newComment.trim();
    if (!content) return;
    setSending(true);
    try {
      const ok = await onAddComment(content);
      if (ok) setNewComment('');
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (comment: Comment) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (likedIds.has(comment._id)) return; // optimistic one-like guard
    setLikedIds((prev) => new Set(prev).add(comment._id));
    try {
      await commentService.reactToComment(comment._id, 'like');
      onLikeDone?.();
    } catch (err: any) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(comment._id);
        return next;
      });
      toast.error(err?.message || 'فشل الإعجاب');
    }
  };

  if (loading) {
    return <Skeleton className="h-24 rounded-xl" count={3} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg p-3 mb-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors"
          rows={3}
          placeholder="أضف تعليقك..."
          aria-label="أضف تعليقك"
          maxLength={2000}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !newComment.trim()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {sending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          أضف تعليق
        </button>
      </div>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">لا توجد تعليقات بعد</div>
        ) : (
          comments.map((comment) => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <SafeImage
                  src={comment.user?.picture || AVATAR_FALLBACK}
                  alt={comment.user?.name || 'مستخدم'}
                  className="w-8 h-8 rounded-full shrink-0"
                />
                <span className="font-bold text-white">{comment.user?.name || 'مستخدم'}</span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-line break-words">{comment.content}</p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleLike(comment)}
                  aria-label="إعجاب"
                  className={`text-xs flex items-center gap-1 transition-colors ${
                    likedIds.has(comment._id) ? 'text-primary' : 'text-gray-400 hover:text-primary'
                  }`}
                >
                  <ThumbsUp size={13} className={likedIds.has(comment._id) ? 'fill-primary' : ''} />
                  إعجاب {(comment.likes?.length || 0) + (likedIds.has(comment._id) ? 1 : 0) > 0
                    ? `(${(comment.likes?.length || 0) + (likedIds.has(comment._id) ? 1 : 0)})`
                    : ''}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
