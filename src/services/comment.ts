import { http } from '../lib/http';

export interface Comment {
  _id: string;
  novelId: string;
  user: {
    _id: string;
    name: string;
    picture?: string;
    role: string;
    isCommentBlocked?: boolean;
  };
  content: string;
  parentId: string | null;
  chapterNumber: number | null;
  likes: string[];
  dislikes: string[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
}

export interface CommentStats {
  like: number;
  love: number;
  funny: number;
  sad: number;
  angry: number;
  total: number;
  userReaction: string | null;
}

export const commentService = {
  async getComments(novelId: string, chapterNumber?: number, page: number = 1, limit: number = 20, sort: 'newest' | 'oldest' | 'best' = 'newest'): Promise<{
    comments: Comment[];
    totalComments: number;
    stats: CommentStats;
  }> {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    query.append('sort', sort);
    if (chapterNumber !== undefined) query.append('chapterNumber', chapterNumber.toString());

    return http.get(`/api/novels/${novelId}/comments?${query.toString()}`);
  },

  async getReplies(commentId: string): Promise<Comment[]> {
    return http.get(`/api/comments/${commentId}/replies`);
  },

  async addComment(novelId: string, content: string, parentId?: string, chapterNumber?: number): Promise<Comment> {
    return http.post<Comment>('/api/comments', { novelId, content, parentId, chapterNumber }, { auth: true });
  },

  async editComment(commentId: string, content: string): Promise<Comment> {
    return http.put<Comment>(`/api/comments/${commentId}`, { content }, { auth: true });
  },

  async deleteComment(commentId: string): Promise<void> {
    await http.delete(`/api/comments/${commentId}`, { auth: true });
  },

  async reactToComment(commentId: string, action: 'like' | 'dislike'): Promise<{ likes: number; dislikes: number }> {
    return http.post<{ likes: number; dislikes: number }>(
      `/api/comments/${commentId}/action`,
      { action },
      { auth: true }
    );
  },
};
