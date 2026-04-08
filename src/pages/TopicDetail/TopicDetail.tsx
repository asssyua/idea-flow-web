import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicAPI, ideaAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import CommentSection from '../../components/CommentSection/CommentSection';
import DragDropUpload from '../../components/DragDropUpload/DragDropUpload';
import Header from '../../components/Header/Header';
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
  isPinned?: boolean;
  canPin?: boolean;
  canEdit?: boolean;
  createdAt: string;
  images?: string[];
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [ideaValidationError, setIdeaValidationError] = useState('');

  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [isUpdatingIdea, setIsUpdatingIdea] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const getUserRoleFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload?.role;
      return role ? String(role) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (id) {
      fetchTopic();
      fetchIdeas();
      fetchFavoriteStatus();
    }
  }, [id]);

  const fetchFavoriteStatus = async () => {
    try {
      const role = getUserRoleFromToken();
      if (!role || role.toLowerCase() === 'admin') {
        return;
      }
      setFavoriteLoading(true);
      const response = await topicAPI.isTopicFavorite(id!);
      setIsFavorite(!!response.data?.isFavorite);
    } catch (err: any) {
      // Если админ/нет прав - просто не показываем функционал
    } finally {
      setFavoriteLoading(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const role = getUserRoleFromToken();
      if (!role || role.toLowerCase() === 'admin') {
        return;
      }
      setFavoriteLoading(true);
      if (isFavorite) {
        const response = await topicAPI.removeTopicFromFavorites(id!);
        setIsFavorite(!!response.data?.isFavorite);
      } else {
        const response = await topicAPI.addTopicToFavorites(id!);
        setIsFavorite(!!response.data?.isFavorite);
      }
    } catch (err: any) {
      // 403 для админа/нет доступа
    } finally {
      setFavoriteLoading(false);
    }
  };

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
      console.log('Fetched ideas:', ideasData);
      ideasData.forEach((idea: Idea) => {
        if (idea.images && idea.images.length > 0) {
          console.log(`Idea ${idea.id} images:`, idea.images.map((img, idx) => ({
            index: idx,
            length: img?.length || 0,
            startsWithData: img?.startsWith('data:image') || false,
            preview: img ? img.substring(0, 100) + '...' : 'null/undefined',
            isValid: img && typeof img === 'string' && img.length > 100
          })));
        }
      });
      setIdeas(ideasData);
      
      const reactions: Record<string, 'like' | 'dislike' | null> = {};
      await Promise.all(
        ideasData
          .filter((idea: Idea) => idea.id)
          .map(async (idea: Idea) => {
            try {
              const reactionResponse = await ideaAPI.getUserReaction(idea.id);
              reactions[idea.id] = reactionResponse.data?.type || null;
            } catch (err) {
              reactions[idea.id] = null;
            }
          })
      );
      setUserReactions(reactions);
    } catch (err: any) {
      console.error('Failed to fetch ideas:', err);
      setIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const maxFileSize = 10 * 1024 * 1024; // 10 MB
    const validFiles = files.filter(file => file.size <= maxFileSize);
    
    setSelectedImages(prev => {
      const combined = [...prev, ...validFiles];
      return combined.slice(0, 5); // max 5 files
    });

    files.forEach(file => {
      if (file.size <= maxFileSize) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => {
            const combined = [...prev, reader.result as string];
            return combined.slice(0, 5);
          });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileRemove = (fileId: string) => {
    const index = parseInt(fileId, 10) || 0;
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const maxFileSize = 5 * 1024 * 1024;
    const validFiles = imageFiles.filter(file => file.size <= maxFileSize);
    if (validFiles.length === 0) return;

    const maxImages = 5;
    const filesToAdd = validFiles.slice(0, maxImages - editSelectedImages.length);

    setEditSelectedImages(prev => [...prev, ...filesToAdd]);

    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEditImage = (index: number) => {
    setEditSelectedImages(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Не удалось создать контекст canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Не удалось сжать изображение'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertImagesToBase64 = async (files: File[]): Promise<string[]> => {
    const compressedFiles = await Promise.all(
      files.map(file => compressImage(file))
    );

    const base64Promises = compressedFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(base64Promises);
  };

  const startEditingIdea = (idea: Idea) => {
    setEditingIdeaId(idea.id);
    setEditTitle(idea.title || '');
    setEditDescription(idea.description || '');
    setEditSelectedImages([]);
    setEditImagePreviews([]);
  };

  const cancelEditingIdea = () => {
    setEditingIdeaId(null);
    setEditTitle('');
    setEditDescription('');
    setEditSelectedImages([]);
    setEditImagePreviews([]);
  };

  const handleUpdateIdea = async (ideaId: string) => {
    try {
      setIsUpdatingIdea(true);

      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
      };

      if (editSelectedImages.length > 0) {
        payload.images = await convertImagesToBase64(editSelectedImages);
      }

      await ideaAPI.updateIdea(ideaId, payload);
      cancelEditingIdea();
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to update idea:', err);
      if (err.response?.status === 403) {
        cancelEditingIdea();
      }
    } finally {
      setIsUpdatingIdea(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic) {
      return;
    }

    // Валидация: проверка на пустое поле
    if (!newIdeaTitle.trim()) {
      setIdeaValidationError('Поле не может быть пустым (минимум 15 символов)');
      // Добавляем анимацию к полю ввода
      const input = document.querySelector('.idea-input') as HTMLInputElement;
      if (input) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
      }
      return;
    }
    
    // Валидация: проверка на минимум 15 символов
    if (newIdeaTitle.trim().length < 15) {
      setIdeaValidationError('Поле не может быть пустым (минимум 15 символов)');
      // Добавляем анимацию к полю ввода
      const input = document.querySelector('.idea-input') as HTMLInputElement;
      if (input) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
      }
      return;
    }

    setIsSubmitting(true);
    setIdeaValidationError('');
    
    try {
      const imageBase64 = selectedImages.length > 0 
        ? await convertImagesToBase64(selectedImages)
        : undefined;

      await ideaAPI.createIdea({
        title: newIdeaTitle.trim(),
        description: newIdeaTitle.trim(),
        topicId: topic.id,
        images: imageBase64,
      });
      setNewIdeaTitle('');
      setSelectedImages([]);
      setImagePreviews([]);
      setIdeaValidationError('');
      const fileInput = document.getElementById('idea-images') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      await fetchIdeas();
      await fetchTopic();
    } catch (err: any) {
      console.error('Failed to create idea:', err);
      setIdeaValidationError('Тема закрыта для обсуждения.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (ideaId: string) => {
    try {
      const currentReaction = userReactions[ideaId];
      const response = await ideaAPI.likeIdea(ideaId);
      
      // Обновляем реакцию пользователя
      const newReactions = { ...userReactions };
      if (currentReaction === 'like') {
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'like';
      }
      setUserReactions(newReactions);
      
      // Обновляем счетчики лайков/дизлайков для конкретной идеи
      if (response.data) {
        setIdeas(prevIdeas => 
          prevIdeas.map(idea => 
            idea.id === ideaId 
              ? { ...idea, likes: response.data.likes, dislikes: response.data.dislikes }
              : idea
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to like idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить лайк';
    }
  };

  const handleDislike = async (ideaId: string) => {
    try {
      const currentReaction = userReactions[ideaId];
      const response = await ideaAPI.dislikeIdea(ideaId);
      
      // Обновляем реакцию пользователя
      const newReactions = { ...userReactions };
      if (currentReaction === 'dislike') {
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'dislike';
      }
      setUserReactions(newReactions);
      
      // Обновляем счетчики лайков/дизлайков для конкретной идеи
      if (response.data) {
        setIdeas(prevIdeas => 
          prevIdeas.map(idea => 
            idea.id === ideaId 
              ? { ...idea, likes: response.data.likes, dislikes: response.data.dislikes }
              : idea
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to dislike idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить дизлайк';
    }
  };

  const handlePin = async (ideaId: string) => {
    try {
      const response = await ideaAPI.pinIdea(ideaId);
      if (response.data) {
        setIdeas((prevIdeas: Idea[]) =>
          prevIdeas.map((idea: Idea) => (idea.id === ideaId ? { ...idea, ...response.data } : idea))
        );
      }
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to pin idea:', err);
    }
  };

  const handleUnpin = async (ideaId: string) => {
    try {
      const response = await ideaAPI.unpinIdea(ideaId);
      if (response.data) {
        setIdeas((prevIdeas: Idea[]) =>
          prevIdeas.map((idea: Idea) => (idea.id === ideaId ? { ...idea, ...response.data } : idea))
        );
      }
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to unpin idea:', err);
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
        <button className="cta-button primary" onClick={() => navigate('/user-dashboard/topics')}>
          Вернуться к темам
        </button>
      </div>
    );
  }

  return (
    <div className="topic-detail">
      <Header />

      <main className="topic-detail-content">
        <div className="container">
          <div className="back-nav">
            <span className="back-link" onClick={() => navigate('/user-dashboard/topics')}>
              <i className="fas fa-arrow-left"></i> Ко всем темам
            </span>
          </div>

          <div className="card topic-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 className="topic-title">{topic.title}</h1>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {(() => {
                  const role = getUserRoleFromToken();
                  const canUseFavorites = role && role.toLowerCase() !== 'admin';
                  if (!canUseFavorites) return null;
                  return (
                    <button
                      className={`fav-btn ${isFavorite ? 'active' : ''}`}
                      onClick={toggleFavorite}
                      disabled={favoriteLoading}
                    >
                      <i className={isFavorite ? 'fas fa-star' : 'far fa-star'}></i>
                    </button>
                  );
                })()}
                {topic.deadline && (
                  <span className={`tag ${new Date(topic.deadline) < new Date() ? 'tag-accent' : ''}`}>
                    {new Date(topic.deadline) < new Date() ? 'Завершена' : 'Активна'}
                  </span>
                )}
              </div>
            </div>
            <p className="topic-description">{topic.description}</p>
            <div className="topic-stats">
              <span className="topic-stat">
                <i className="far fa-lightbulb"></i> {topic.ideaCount || 0} идей
              </span>
              {topic.createdBy && (
                <span className="topic-stat">
                  <i className="far fa-user"></i> {topic.createdBy.firstName} {topic.createdBy.lastName}
                </span>
              )}
              {topic.deadline && (
                <span className={`topic-stat topic-stat-tag ${new Date(topic.deadline) < new Date() ? 'tag tag-accent' : 'tag'}`}>
                  <i className="far fa-calendar"></i> {new Date(topic.deadline) < new Date() ? 'Завершено:' : 'До:'} {formatDeadline(topic.deadline)}
                </span>
              )}
              {!topic.deadline && (
                <span className="topic-stat">
                  <i className="far fa-calendar"></i> Без срока
                </span>
              )}
            </div>
          </div>

          <div className="add-idea-bar">
            <button className="btn btn-primary" onClick={() => document.querySelector('.add-idea-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <i className="fas fa-plus"></i> Предложить идею
            </button>
          </div>

          <div className="card add-idea-section">
            <div className="card-title">
              <h3>Добавить идею</h3>
            </div>
            <form onSubmit={handleCreateIdea} className="add-idea-form">
              <input
                type="text"
                value={newIdeaTitle}
                onChange={(e) => {
                  setNewIdeaTitle(e.target.value);
                  if (ideaValidationError) {
                    setIdeaValidationError('');
                  }
                }}
                onBlur={() => {
                  if (newIdeaTitle.trim().length > 0 && newIdeaTitle.trim().length < 15) {
                    setIdeaValidationError('Поле не может быть пустым (минимум 15 символов)');
                  }
                }}
                placeholder="Введите вашу идею (минимум 15 символов)..."
                className="comment-input"
                disabled={isSubmitting}
                style={{
                  border: ideaValidationError 
                    ? '1px solid #dc3545' 
                    : '1px solid var(--border)',
                  marginBottom: ideaValidationError ? '0.5rem' : '1rem',
                }}
              />
              
              {ideaValidationError && (
                <div style={{
                  color: '#dc3545',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px'
                }}>
                  {ideaValidationError}
                </div>
              )}
              
              <div className="image-upload-section">
                <DragDropUpload
                  maxFiles={5}
                  maxFileSize={10 * 1024 * 1024}
                  acceptedFormats={['image/jpeg', 'image/png', 'image/jpg']}
                  onFilesSelected={handleFilesSelected}
                  onFileRemove={handleFileRemove}
                  disabled={isSubmitting || selectedImages.length >= 5}
                  label="Перетащите изображения сюда или нажмите для выбора"
                  key={selectedImages.length === 0 ? 'empty' : 'filled'}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newIdeaTitle.trim() || newIdeaTitle.trim().length < 15 || isSubmitting}
              >
                {isSubmitting ? 'Добавление...' : 'Добавить идею'}
              </button>
            </form>
          </div>

          <div className="ideas-section">
            <div className="card-title" style={{ marginBottom: '1.5rem' }}>
              <h3><i className="far fa-lightbulb"></i> Идеи ({ideas.length})</h3>
            </div>
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
              <div className="ideas-list" id="ideas-list">
                {ideas
                  .filter((idea) => idea.id)
                  .map((idea) => (
                  <div key={idea.id} className="idea-card-full">
                    <div className="idea-main">
                      {editingIdeaId === idea.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="idea-input"
                            disabled={isUpdatingIdea}
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            disabled={isUpdatingIdea}
                            style={{
                              width: '100%',
                              minHeight: '90px',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--surface)',
                              color: 'var(--text-main)',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />

                          <div className="image-upload-section">
                            <label htmlFor={`edit-idea-images-${idea.id}`} className="image-upload-label">
                              <span className="upload-icon">📷</span>
                              <span>Обновить изображения (макс. 5)</span>
                              <input
                                id={`edit-idea-images-${idea.id}`}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleEditImageSelect}
                                disabled={isUpdatingIdea || editSelectedImages.length >= 5}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {editImagePreviews.length > 0 && (
                              <div className="image-previews">
                                {editImagePreviews.map((preview, index) => (
                                  <div key={index} className="image-preview-item">
                                    <img src={preview} alt={`Edit preview ${index + 1}`} className="image-preview" />
                                    <button
                                      type="button"
                                      className="remove-image-btn"
                                      onClick={() => removeEditImage(index)}
                                      disabled={isUpdatingIdea}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateIdea(idea.id)}
                              disabled={isUpdatingIdea || !editTitle.trim() || editTitle.trim().length < 15}
                            >
                              {isUpdatingIdea ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={cancelEditingIdea}
                              disabled={isUpdatingIdea}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="idea-header-row">
                            <div className="idea-name">
                              {idea.isPinned ? <span title="Закреплено">📌 </span> : null}
                              {idea.title}
                            </div>
                            <button 
                              className={`idea-like-right ${userReactions[idea.id] === 'like' ? 'liked' : ''}`}
                              onClick={() => handleLike(idea.id)}
                            >
                              <i className={userReactions[idea.id] === 'like' ? 'fas fa-heart' : 'far fa-heart'}></i>
                              <span>{idea.likes}</span>
                            </button>
                          </div>
                          
                          {idea.description && (
                            <p className="idea-description">
                              {idea.description}
                            </p>
                          )}
                          
                          {idea.images && idea.images.length > 0 && (
                            <div className="idea-images">
                              {idea.images
                                .filter((image) => {
                                  if (!image || typeof image !== 'string' || image.length < 100) {
                                    return false;
                                  }
                                  return image.startsWith('data:image') || 
                                         /^[A-Za-z0-9+/=]+$/.test(image.substring(0, 100)) ||
                                         image.startsWith('/9j/') || 
                                         image.startsWith('iVBORw0KGgo');
                                })
                                .map((image, index) => {
                                let imageSrc = image.trim();
                                
                                try {
                                  if (imageSrc.startsWith('data:image')) {
                                    const correctFormat = /^data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=\s]+)$/;
                                    const match = imageSrc.match(correctFormat);
                                    
                                    if (match && match[2] && match[2].trim().length > 100) {
                                      imageSrc = `data:image/${match[1]};base64,${match[2].replace(/\s/g, '')}`;
                                    } else {
                                      const patterns = [
                                        /base64[,:]\s*([A-Za-z0-9+/=\s]+)$/,
                                        /base64\s*([A-Za-z0-9+/=\s]+)$/,
                                        /:\s*([A-Za-z0-9+/=\s]+)$/,
                                      ];
                                      
                                      let base64Data = null;
                                      for (const pattern of patterns) {
                                        const m = imageSrc.match(pattern);
                                        if (m && m[1] && m[1].trim().length > 100) {
                                          base64Data = m[1].trim().replace(/\s/g, '');
                                          break;
                                        }
                                      }
                                      
                                      if (base64Data) {
                                        let mimeType = 'jpeg';
                                        const lowerSrc = imageSrc.toLowerCase();
                                        if (lowerSrc.includes('png') || base64Data.startsWith('iVBOR')) {
                                          mimeType = 'png';
                                        } else if (lowerSrc.includes('jpeg') || lowerSrc.includes('jpg') || base64Data.startsWith('/9j/') || base64Data.startsWith('FFD8')) {
                                          mimeType = 'jpeg';
                                        } else if (lowerSrc.includes('gif') || base64Data.startsWith('R0lGOD')) {
                                          mimeType = 'gif';
                                        } else if (lowerSrc.includes('webp') || base64Data.startsWith('UklGR')) {
                                          mimeType = 'webp';
                                        }
                                        imageSrc = `data:image/${mimeType};base64,${base64Data}`;
                                      } else {
                                        return null;
                                      }
                                    }
                                  } else {
                                    const cleanBase64 = imageSrc.replace(/\s/g, '');
                                    
                                    let mimeType = 'jpeg';
                                    if (cleanBase64.startsWith('iVBORw0KGgo') || cleanBase64.startsWith('iVBOR')) {
                                      mimeType = 'png';
                                    } else if (cleanBase64.startsWith('/9j/') || cleanBase64.startsWith('FFD8')) {
                                      mimeType = 'jpeg';
                                    } else if (cleanBase64.startsWith('R0lGOD')) {
                                      mimeType = 'gif';
                                    } else if (cleanBase64.startsWith('UklGR')) {
                                      mimeType = 'webp';
                                    }
                                    imageSrc = `data:image/${mimeType};base64,${cleanBase64}`;
                                  }
                                  
                                  const base64Data = imageSrc.split(',')[1];
                                  if (!base64Data || base64Data.length < 100) {
                                    return null;
                                  }
                                  
                                  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
                                    return null;
                                  }
                                } catch (error) {
                                  console.error('Error processing image:', error);
                                  return null;
                                }
                                
                                return (
                                  <div key={`${idea.id}-img-${index}`} className="idea-image-wrapper">
                                    <img 
                                      src={imageSrc} 
                                      alt={`${idea.title} - изображение ${index + 1}`}
                                      className="idea-image"
                                      onClick={() => setViewingImage(imageSrc)}
                                      onError={(e) => {
                                        console.error('Failed to load image at index', index, 'Length:', imageSrc.length);
                                        console.error('Image preview (first 100 chars):', imageSrc.substring(0, 100));
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                );
                              })
                              .filter(Boolean) 
                              }
                            </div>
                          )}
                          
                          <div className="idea-meta">
                            <span>
                              <i className="far fa-user"></i> Автор: {idea.author.firstName} {idea.author.lastName}
                            </span>
                            <span>
                              <i className="far fa-calendar"></i> {formatDate(idea.createdAt)}
                            </span>
                          </div>

                          {/* Admin actions */}
                          {(idea.canEdit || idea.canPin) && (
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {idea.canEdit && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => startEditingIdea(idea)}
                                >
                                  Редактировать
                                </button>
                              )}
                              {idea.canPin && (
                                idea.isPinned ? (
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleUnpin(idea.id)}
                                  >
                                    Открепить
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handlePin(idea.id)}
                                  >
                                    Закрепить
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <CommentSection ideaId={idea.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="topic-detail-footer">
        &copy; 2026 IdeaFlow Platform — обсуждение идей
      </footer>

      {viewingImage && (
        <div className="image-viewer-overlay" onClick={() => setViewingImage(null)}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-viewer-close" onClick={() => setViewingImage(null)}>
              ×
            </button>
            <img src={viewingImage} alt="Просмотр изображения" className="image-viewer-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicDetail;

