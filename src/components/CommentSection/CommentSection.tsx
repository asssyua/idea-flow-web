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
}

const CommentSection: React.FC<CommentSectionProps> = ({ ideaId }) => {
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
      
      // Организуем комментарии в иерархическую структуру
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
    // Разделяем на родительские и дочерние комментарии
    const parentComments = commentsData.filter(c => !c.parentId);
    const childComments = commentsData.filter(c => c.parentId);

    // Группируем дочерние комментарии по parentId
    const repliesMap = new Map<string, Comment[]>();
    childComments.forEach(reply => {
      if (reply.parentId) {
        if (!repliesMap.has(reply.parentId)) {
          repliesMap.set(reply.parentId, []);
        }
        repliesMap.get(reply.parentId)!.push(reply);
      }
    });

    // Добавляем ответы к родительским комментариям
    return parentComments.map(comment => ({
      ...comment,
      replies: repliesMap.get(comment.id) || []
    }));
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
      alert(err.response?.data?.message || 'Не удалось добавить комментарий');
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
      alert(err.response?.data?.message || 'Не удалось добавить ответ');
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
      <h3 className="comment-section-title">Комментарии</h3>

      {/* Форма добавления комментария */}
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

      {/* Список комментариев */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="empty-comments">
            <p>Пока нет комментариев. Будьте первым!</p>
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
              replyContent={replyContent[comment.id] || ''}
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
  replyContent: string;
  onReplyContentChange: (parentId: string, content: string) => void;
  onSubmitReply: (parentId: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  isSubmitting: boolean;
  formatDate: (date: string) => string;
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
}) => {
  const isReplying = replyingTo === comment.id;

  return (
    <div className="comment-item">
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">
            {comment.author.firstName} {comment.author.lastName}
          </span>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="comment-text">{comment.content}</p>
        <button
          className="reply-button"
          onClick={() => onReply(comment.id)}
          disabled={isReplying || isSubmitting}
        >
          Ответить
        </button>
      </div>

      {/* Форма ответа */}
      {isReplying && (
        <div className="reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => onReplyContentChange(comment.id, e.target.value)}
            placeholder="Напишите ответ..."
            className="comment-input"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="reply-actions">
            <button
              className="cta-button primary"
              onClick={() => onSubmitReply(comment.id)}
              disabled={!replyContent.trim() || isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              className="cta-button secondary"
              onClick={onCancelReply}
              disabled={isSubmitting}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Вложенные комментарии (ответы) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="comment-item reply-item">
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">
                    {reply.author.firstName} {reply.author.lastName}
                  </span>
                  <span className="comment-date">{formatDate(reply.createdAt)}</span>
                </div>
                <p className="comment-text">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;

