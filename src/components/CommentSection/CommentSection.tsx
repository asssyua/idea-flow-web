import React, { useState, useEffect } from 'react';
import { ideaAPI } from '../../api';
import './CommentSection.css';

interface Comment {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
  };
  parentId: string | null;
  createdAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  ideaId: string;
  readOnly?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ ideaId, readOnly = false }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [ideaId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await ideaAPI.getComments(ideaId);
      const commentsData = Array.isArray(response.data) ? response.data : [];
      
      const organizedComments = organizeComments(commentsData);
      setComments(organizedComments);
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const organizeComments = (commentsData: Comment[]): Comment[] => {

    const commentMap = new Map<string, Comment>();
    commentsData.forEach(c => {
      commentMap.set(c.id, { ...c, replies: [] });
    });


    const buildReplies = (commentId: string): Comment[] => {
      return commentsData
        .filter(c => c.parentId === commentId)
        .map(reply => {
          const comment = commentMap.get(reply.id);
          if (!comment) return reply;
          return { ...comment, replies: buildReplies(reply.id) };
        });
    };


    return commentsData
      .filter(c => !c.parentId)
      .map(c => {
        const comment = commentMap.get(c.id);
        if (!comment) return c;
        return { ...comment, replies: buildReplies(c.id) };
      });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await ideaAPI.addComment(ideaId, {
        content: newComment.trim(),
      });
      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const content = replyContent[parentId]?.trim();
    if (!content) {
      return;
    }

    setIsSubmitting(true);
    try {
      await ideaAPI.addComment(ideaId, {
        content,
        parentId,
      });
      setReplyContent(prev => {
        const newContent = { ...prev };
        delete newContent[parentId];
        return newContent;
      });
      setReplyingTo(null);
      await fetchComments();
    } catch (err: any) {
      console.error('Failed to add reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Возвращаем исходную строку, если дата невалидна
      }
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="comments-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка комментариев...</p>
      </div>
    );
  }

  return (
    <div className="comment-section">
      <div className="comments-title">
        <i className="far fa-message"></i> {comments.length} комментариев
      </div>

      {!readOnly && (
        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Напишите комментарий..."
            className="comment-input"
            rows={3}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="cta-button primary"
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить комментарий'}
          </button>
        </form>
      )}

      <div className="comment-thread comments-list">
        {comments.length === 0 ? (
          <div className="empty-comments">
            <p>{readOnly ? 'Нет комментариев' : 'Пока нет комментариев. Будьте первым!'}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(parentId) => {
                setReplyingTo(parentId);
                if (!replyContent[parentId]) {
                  setReplyContent(prev => ({ ...prev, [parentId]: '' }));
                }
              }}
              replyContent={replyContent}
              onReplyContentChange={(parentId, content) => {
                setReplyContent(prev => ({ ...prev, [parentId]: content }));
              }}
              onSubmitReply={handleSubmitReply}
              replyingTo={replyingTo}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyContent(prev => {
                  const newContent = { ...prev };
                  delete newContent[comment.id];
                  return newContent;
                });
              }}
              isSubmitting={isSubmitting}
              formatDate={formatDate}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  replyContent: Record<string, string>;
  onReplyContentChange: (parentId: string, content: string) => void;
  onSubmitReply: (parentId: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  isSubmitting: boolean;
  formatDate: (date: string) => string;
  readOnly?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  replyingTo,
  onCancelReply,
  isSubmitting,
  formatDate,
  readOnly = false,
}) => {
  const isReplying = replyingTo === comment.id;

  return (
    <div className="comment-item">
      <div className="comment-main comment-content">
        <div className="comment-header">
          <span className="comment-author">
            {comment.author.firstName} {comment.author.lastName}
          </span>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="comment-text">{comment.content}</p>
        <div className="comment-actions">
          {!readOnly && (
            <button
              className="reply-btn"
              onClick={(e) => {
                e.preventDefault();
                onReply(comment.id);
              }}
              disabled={isReplying || isSubmitting}
            >
              <i className="far fa-comment"></i> Ответить
            </button>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="reply-form">
          <textarea
            value={replyContent[comment.id] || ''}
            onChange={(e) => onReplyContentChange(comment.id, e.target.value)}
            placeholder="Напишите ответ..."
            className="comment-input"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="reply-actions">
            <button
              type="button"
              className="cta-button primary"
              onClick={(e) => {
                e.preventDefault();
                onSubmitReply(comment.id);
              }}
              disabled={!(replyContent[comment.id] || '').trim() || isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              type="button"
              className="cta-button secondary"
              onClick={(e) => {
                e.preventDefault();
                onCancelReply();
              }}
              disabled={isSubmitting}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              replyContent={replyContent}
              onReplyContentChange={onReplyContentChange}
              onSubmitReply={onSubmitReply}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
              isSubmitting={isSubmitting}
              formatDate={formatDate}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;

