import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { commentService, Comment } from '../services/comment';
import { Skeleton } from './Skeleton';

interface CommentSectionProps {
  novelId: string;
  comments: Comment[];
  loading: boolean;
  onAddComment: (content: string) => Promise<void>;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  novelId,
  comments,
  loading,
  onAddComment,
}) => {
  const [newComment, setNewComment] = useState('');
  const { isAuthenticated, openAuthModal } = useAuth();

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!newComment.trim()) return;
    await onAddComment(newComment);
    setNewComment('');
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
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
        >
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
                <img
                  src={comment.user.picture || '/default-avatar.png'}
                  alt={comment.user.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-bold">{comment.user.name}</span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-foreground">{comment.content}</p>
              <div className="flex gap-4 mt-2">
                <button className="text-xs text-gray-400 hover:text-primary transition-colors">رد</button>
                <button className="text-xs text-gray-400 hover:text-primary transition-colors">إعجاب</button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};