import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicAPI, ideaAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './TopicDetail.css';

interface Topic {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  ideaCount: number;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  likes: number;
  dislikes: number;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

const TopicDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userReactions, setUserReactions] = useState<Record<string, 'like' | 'dislike' | null>>({});
  const [loading, setLoading] = useState(true);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [error, setError] = useState('');
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTopic();
      fetchIdeas();
    }
  }, [id]);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await topicAPI.getTopicById(id!);
      setTopic(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch topic:', err);
      setError('Не удалось загрузить тему');
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIdeas = async () => {
    try {
      setIdeasLoading(true);
      const response = await ideaAPI.getIdeasByTopic(id!);
      const ideasData = Array.isArray(response.data) ? response.data : response.data?.ideas || [];
      setIdeas(ideasData);
    } catch (err: any) {
      console.error('Failed to fetch ideas:', err);
      setIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() || !topic) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Используем title как и description, так как бэкенд требует description
      await ideaAPI.createIdea({
        title: newIdeaTitle.trim(),
        description: newIdeaTitle.trim(), // Используем title как description
        topicId: topic.id,
      });
      setNewIdeaTitle('');
      await fetchIdeas();
      await fetchTopic(); // Обновляем счетчик идей
    } catch (err: any) {
      console.error('Failed to create idea:', err);
      alert(err.response?.data?.message || 'Не удалось добавить идею');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (ideaId: string) => {
    try {
      const currentReaction = userReactions[ideaId];
      await ideaAPI.likeIdea(ideaId);
      
      // Обновляем состояние реакций
      const newReactions = { ...userReactions };
      if (currentReaction === 'like') {
        // Если уже был лайк, возможно произошла ошибка или реакция была удалена
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'like';
        // Если был дизлайк, убираем его
        if (currentReaction === 'dislike') {
          newReactions[ideaId] = 'like';
        }
      }
      setUserReactions(newReactions);
      
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to like idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить лайк';
      if (!errorMsg.includes('already liked')) {
        alert(errorMsg);
      }
    }
  };

  const handleDislike = async (ideaId: string) => {
    try {
      const currentReaction = userReactions[ideaId];
      await ideaAPI.dislikeIdea(ideaId);
      
      // Обновляем состояние реакций
      const newReactions = { ...userReactions };
      if (currentReaction === 'dislike') {
        // Если уже был дизлайк, возможно произошла ошибка или реакция была удалена
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'dislike';
        // Если был лайк, убираем его
        if (currentReaction === 'like') {
          newReactions[ideaId] = 'dislike';
        }
      }
      setUserReactions(newReactions);
      
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to dislike idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить дизлайк';
      if (!errorMsg.includes('already disliked')) {
        alert(errorMsg);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    if (deadlineDate < now) {
      return 'Истек';
    }
    
    return formatDate(deadline);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка темы...</p>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="error-container">
        <h3>Ошибка</h3>
        <p>{error || 'Тема не найдена'}</p>
        <button className="cta-button primary" onClick={() => navigate('/user-dashboard')}>
          Вернуться к темам
        </button>
      </div>
    );
  }

  return (
    <div className="topic-detail">
      <header className="topic-detail-header">
        <div className="container">
          <div className="header-content">
            <button onClick={() => navigate('/user-dashboard')} className="back-button">
              ← Назад к темам
            </button>
          </div>
        </div>
      </header>

      <main className="topic-detail-content">
        <div className="container">
          {/* Карточка темы */}
          <div className="topic-card-detail">
            <div className="topic-card-header">
              <h1 className="topic-card-title">{topic.title}</h1>
              {topic.deadline && (
                <span className={`topic-deadline ${new Date(topic.deadline) < new Date() ? 'expired' : ''}`}>
                  {formatDeadline(topic.deadline) || 'Истек'}
                </span>
              )}
            </div>
            <p className="topic-card-description">{topic.description}</p>
            <div className="topic-card-meta">
              <span className="topic-card-author">
                Автор: {topic.createdBy ? `${topic.createdBy.firstName} ${topic.createdBy.lastName}` : 'Неизвестен'}
              </span>
              {topic.createdAt && (
                <span className="topic-card-date">
                  Создан: {formatDate(topic.createdAt)}
                </span>
              )}
              <span className="topic-card-ideas">
                Идей: {topic.ideaCount || 0}
              </span>
            </div>
          </div>

          {/* Форма добавления идеи */}
          <div className="add-idea-section">
            <h2 className="section-title">Добавить идею</h2>
            <form onSubmit={handleCreateIdea} className="add-idea-form">
              <input
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                placeholder="Введите вашу идею..."
                className="idea-input"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="cta-button primary"
                disabled={!newIdeaTitle.trim() || isSubmitting}
              >
                {isSubmitting ? 'Добавление...' : 'Добавить идею'}
              </button>
            </form>
          </div>

          {/* Список идей */}
          <div className="ideas-section">
            <h2 className="section-title">Идеи ({ideas.length})</h2>
            {ideasLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка идей...</p>
              </div>
            ) : ideas.length === 0 ? (
              <div className="empty-state">
                <p>Пока нет идей. Будьте первым, кто предложит идею!</p>
              </div>
            ) : (
              <div className="ideas-list">
                {ideas.map((idea) => (
                  <div key={idea.id} className="idea-card">
                    <div className="idea-content">
                      <h3 className="idea-title">{idea.title}</h3>
                      <div className="idea-meta">
                        <span className="idea-author">
                          {idea.author.firstName} {idea.author.lastName}
                        </span>
                        <span className="idea-date">
                          {formatDate(idea.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="idea-actions">
                      <button
                        className={`action-button like-button ${userReactions[idea.id] === 'like' ? 'active' : ''}`}
                        onClick={() => handleLike(idea.id)}
                      >
                        <span className="action-icon">👍</span>
                        <span className="action-count">{idea.likes}</span>
                      </button>
                      <button
                        className={`action-button dislike-button ${userReactions[idea.id] === 'dislike' ? 'active' : ''}`}
                        onClick={() => handleDislike(idea.id)}
                      >
                        <span className="action-icon">👎</span>
                        <span className="action-count">{idea.dislikes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TopicDetail;

