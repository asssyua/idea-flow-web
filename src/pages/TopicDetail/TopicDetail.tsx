import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicAPI, ideaAPI } from '../../api';
import CommentSection from '../../components/CommentSection/CommentSection';
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
      console.log('Fetched ideas:', ideasData);
      // Логируем изображения для отладки
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
      
      // Загружаем реакции пользователя для каждой идеи
      const reactions: Record<string, 'like' | 'dislike' | null> = {};
      await Promise.all(
        ideasData
          .filter((idea: Idea) => idea.id) // Фильтруем идеи с валидным id
          .map(async (idea: Idea) => {
            try {
              const reactionResponse = await ideaAPI.getUserReaction(idea.id);
              reactions[idea.id] = reactionResponse.data?.type || null;
            } catch (err) {
              // Если не удалось загрузить реакцию, считаем что её нет
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите файлы изображений');
      return;
    }

    // Проверяем размер файлов (максимум 5MB на файл)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const validFiles = imageFiles.filter(file => {
      if (file.size > maxFileSize) {
        alert(`Файл "${file.name}" слишком большой (максимум 5MB). Он будет пропущен.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Ограничиваем количество изображений
    const maxImages = 5;
    const filesToAdd = validFiles.slice(0, maxImages - selectedImages.length);
    
    if (validFiles.length > filesToAdd.length) {
      alert(`Можно загрузить максимум ${maxImages} изображений`);
    }

    setSelectedImages(prev => [...prev, ...filesToAdd]);

    // Создаем превью для новых изображений
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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

          // Вычисляем новые размеры с сохранением пропорций
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
              // Создаем новый File объект с тем же именем
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
    // Сначала сжимаем все изображения
    const compressedFiles = await Promise.all(
      files.map(file => compressImage(file))
    );

    // Затем конвертируем в base64
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

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() || !topic) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Конвертируем изображения в base64
      const imageBase64 = selectedImages.length > 0 
        ? await convertImagesToBase64(selectedImages)
        : undefined;

      // Используем title как и description, так как бэкенд требует description
      await ideaAPI.createIdea({
        title: newIdeaTitle.trim(),
        description: newIdeaTitle.trim(), // Используем title как description
        topicId: topic.id,
        images: imageBase64,
      });
      setNewIdeaTitle('');
      setSelectedImages([]);
      setImagePreviews([]);
      // Сбрасываем input для файлов
      const fileInput = document.getElementById('idea-images') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
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
      
      // Обновляем состояние реакций на основе текущей реакции
      const newReactions = { ...userReactions };
      if (currentReaction === 'like') {
        // Если уже был лайк, теперь он удален (toggle)
        newReactions[ideaId] = null;
      } else {
        // Ставим лайк (либо новый, либо заменяем дизлайк)
        newReactions[ideaId] = 'like';
      }
      setUserReactions(newReactions);
      
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to like idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить лайк';
      alert(errorMsg);
    }
  };

  const handleDislike = async (ideaId: string) => {
    try {
      const currentReaction = userReactions[ideaId];
      await ideaAPI.dislikeIdea(ideaId);
      
      // Обновляем состояние реакций на основе текущей реакции
      const newReactions = { ...userReactions };
      if (currentReaction === 'dislike') {
        // Если уже был дизлайк, теперь он удален (toggle)
        newReactions[ideaId] = null;
      } else {
        // Ставим дизлайк (либо новый, либо заменяем лайк)
        newReactions[ideaId] = 'dislike';
      }
      setUserReactions(newReactions);
      
      await fetchIdeas();
    } catch (err: any) {
      console.error('Failed to dislike idea:', err);
      const errorMsg = err.response?.data?.message || 'Не удалось поставить дизлайк';
      alert(errorMsg);
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
              
              {/* Загрузка изображений */}
              <div className="image-upload-section">
                <label htmlFor="idea-images" className="image-upload-label">
                  <span className="upload-icon">📷</span>
                  <span>Добавить изображения (макс. 5)</span>
                  <input
                    id="idea-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={isSubmitting || selectedImages.length >= 5}
                    style={{ display: 'none' }}
                  />
                </label>
                
                {/* Превью изображений */}
                {imagePreviews.length > 0 && (
                  <div className="image-previews">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={preview} alt={`Preview ${index + 1}`} className="image-preview" />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeImage(index)}
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                {ideas
                  .filter((idea) => idea.id) // Фильтруем идеи с валидным id
                  .map((idea) => (
                  <div key={idea.id} className="idea-card-with-comments">
                    <div className="idea-card">
                      <div className="idea-content">
                        <h3 className="idea-title">{idea.title}</h3>
                        
                        {/* Изображения идеи */}
                        {idea.images && idea.images.length > 0 && (
                          <div className="idea-images">
                            {idea.images
                              .filter((image) => {
                                // Фильтруем валидные изображения
                                if (!image || typeof image !== 'string' || image.length < 100) {
                                  return false;
                                }
                                // Проверяем, что это либо полная data URL, либо валидная base64 строка
                                return image.startsWith('data:image') || 
                                       /^[A-Za-z0-9+/=]+$/.test(image.substring(0, 100)) ||
                                       image.startsWith('/9j/') || 
                                       image.startsWith('iVBORw0KGgo');
                              })
                              .map((image, index) => {
                              // Нормализуем формат изображения
                              let imageSrc = image.trim();
                              
                              try {
                                // Если уже полная data URL
                                if (imageSrc.startsWith('data:image')) {
                                  // Проверяем правильный формат: data:image/type;base64,data
                                  const correctFormat = /^data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=\s]+)$/;
                                  const match = imageSrc.match(correctFormat);
                                  
                                  if (match && match[2] && match[2].trim().length > 100) {
                                    // Формат правильный, очищаем пробелы в base64
                                    imageSrc = `data:image/${match[1]};base64,${match[2].replace(/\s/g, '')}`;
                                  } else {
                                    // Пытаемся исправить поврежденный формат
                                    // Ищем base64 данные после различных вариантов разделителей
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
                                      // Определяем MIME тип из строки или по содержимому
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
                                      // Если не удалось найти base64 данные, пропускаем
                                      return null;
                                    }
                                  }
                                } else {
                                  // Это только base64 строка, нужно добавить префикс
                                  const cleanBase64 = imageSrc.replace(/\s/g, '');
                                  
                                  // Определяем тип по началу base64
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
                                
                                // Финальная проверка валидности
                                const base64Data = imageSrc.split(',')[1];
                                if (!base64Data || base64Data.length < 100) {
                                  return null;
                                }
                                
                                // Проверяем, что base64 строка валидна
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
                            .filter(Boolean) // Убираем null значения
                          }
                          </div>
                        )}
                        
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
                    <CommentSection ideaId={idea.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Модальное окно для просмотра изображения */}
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

