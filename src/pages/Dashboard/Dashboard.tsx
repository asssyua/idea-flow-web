import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, authAPI, adminAPI, topicAPI, ideaAPI } from '../../api';
import BlockUserModal from '../../components/Modals/BlockUserModal';
import ConfirmModal from '../../components/Modals/ConfirmModal';
import TopicModal from '../../components/Modals/TopicModal';
import CommentSection from '../../components/CommentSection/CommentSection';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './Dashboard.css';

interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
  role?: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: string;
  blockInfo?: {
    blockedAt: string;
    blockReason: string;
  };
}

interface SupportMessage {
  id: string;
  userEmail: string;
  userName: string;
  message: string;
  blockReason: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  status: string;
  privacy: string;
  deadline: string | null;
  ideaCount: number;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
  author?: {
    firstName: string;
    lastName: string;
  }; // Для обратной совместимости
  createdAt?: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  images?: string[];
  likes: number;
  dislikes: number;
  rating: number;
  commentCount: number;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  topic: {
    title: string;
    status: string;
  };
  topicId?: string;
  authorId?: string;
}

interface Comment {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
    id: string;
  };
  idea: {
    id: string;
    title: string;
    topic: {
      id: string;
      title: string;
    };
  };
  parentId: string | null;
  createdAt: string;
}

type AdminTab = 'users' | 'topics' | 'ideas' | 'support' | 'ideaflow';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [deleteTopicModalOpen, setDeleteTopicModalOpen] = useState(false);
  const [deleteIdeaModalOpen, setDeleteIdeaModalOpen] = useState(false);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [selectedTopicForFlow, setSelectedTopicForFlow] = useState<Topic | null>(null);
  const [flowIdeas, setFlowIdeas] = useState<Idea[]>([]);
  const [flowIdeasLoading, setFlowIdeasLoading] = useState(false);
  const [flowUserReactions, setFlowUserReactions] = useState<Record<string, 'like' | 'dislike' | null>>({});
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'support') {
        loadSupportMessages();
      } else if (activeTab === 'topics') {
        loadTopics();
      } else if (activeTab === 'ideaflow') {
        loadTopics();
        if (selectedTopicForFlow) {
          fetchFlowIdeas(selectedTopicForFlow.id);
        }
      } else if (activeTab === 'ideas') {
        loadIdeas();
        loadComments();
      }
    }
  }, [isAdmin, activeTab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      console.log('=== PROFILE API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('User data:', response.data.user);
      
      const userData = response.data.user;
      setUser(userData);
      setError('');

      let userRole = userData?.role;
      
      if (!userRole) {
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
            console.log('Role from JWT token:', userRole);
          }
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      let isUserAdmin = false;
      
      console.log('Raw userRole:', userRole, 'Type:', typeof userRole);
      
      if (userRole) {
        if (typeof userRole === 'string') {
          isUserAdmin = userRole.toLowerCase() === 'admin';
        } else if (typeof userRole === 'object') {
          const roleValue = userRole.toString ? userRole.toString() : String(userRole);
          isUserAdmin = roleValue.toLowerCase() === 'admin';
        }
      }
      
      console.log('User role:', userRole, 'Type:', typeof userRole, 'Is admin:', isUserAdmin);
      console.log('Full userData keys:', userData ? Object.keys(userData) : 'null');
      
      setIsAdmin(isUserAdmin);
      
      if (!isUserAdmin) {
        console.log('User is not admin, redirecting to user-dashboard');
        navigate('/user-dashboard');
        return;
      }
      
      console.log('User is admin, showing admin dashboard');
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Не удалось загрузить профиль');
      
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSupportMessages = async () => {
    setSupportLoading(true);
    try {
      const response = await adminAPI.getAllSupportMessages();
      setSupportMessages(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load support messages', err);
      setError('Не удалось загрузить сообщения поддержки');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await adminAPI.markSupportMessageAsRead(id);
      await loadSupportMessages();
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  };

  const loadTopics = async () => {
    setTopicsLoading(true);
    try {
      const response = await topicAPI.getAllTopics();
      setTopics(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load topics', err);
      setError('Не удалось загрузить список тем для обсуждения');
    } finally {
      setTopicsLoading(false);
    }
  };

  const loadIdeas = async () => {
    setIdeasLoading(true);
    try {
      const response = await ideaAPI.getAllIdeas();
      console.log('Loaded ideas:', response.data);
      setIdeas(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load ideas', err);
      setError('Не удалось загрузить список идей');
    } finally {
      setIdeasLoading(false);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await ideaAPI.getAllComments();
      console.log('Loaded comments response:', response);
      console.log('Loaded comments data:', response.data);
      console.log('Comments count:', response.data?.length || 0);
      
      if (response.data && Array.isArray(response.data)) {
        setComments(response.data);
        console.log('Comments set successfully:', response.data.length);
      } else {
        console.warn('Comments data is not an array:', response.data);
        setComments([]);
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to load comments', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Не удалось загрузить список комментариев');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCreateTopic = () => {
    setSelectedTopic(null);
    setTopicModalOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setTopicModalOpen(true);
  };

  const handleDeleteTopic = (topic: Topic) => {
    setTopicToDelete(topic);
    setDeleteTopicModalOpen(true);
  };

  const handleDeleteTopicConfirm = async () => {
    if (!topicToDelete) return;

    try {
      await topicAPI.deleteTopic(topicToDelete.id);
      await loadTopics();
      setDeleteTopicModalOpen(false);
      setTopicToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete topic', err);
      const errorMessage = err.response?.data?.message || 'Не удалось удалить тему для обсуждения';
      alert(errorMessage);
    }
  };

  const handleTopicSave = async (topicData: any) => {
    try {
      if (selectedTopic) {
        await topicAPI.updateTopic(selectedTopic.id, topicData);
      } else {
        await topicAPI.createTopic(topicData);
      }
      await loadTopics();
      setTopicModalOpen(false);
      setSelectedTopic(null);
    } catch (err: any) {
      console.error('Failed to save topic', err);
      const errorMessage = err.response?.data?.message || 'Не удалось сохранить тему для обсуждения';
      alert(errorMessage);
    }
  };

  const handleBlockClick = (id: string, userName: string) => {
    setSelectedUserId(id);
    setSelectedUserName(userName);
    setBlockModalOpen(true);
  };

  const handleBlockConfirm = async (reason: string) => {
    if (!selectedUserId) return;

    try {
      await adminAPI.blockUser(selectedUserId, { reason });
      setBlockModalOpen(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to block user', err);
      const errorMessage = err.response?.data?.message || 'Не удалось заблокировать пользователя';
      alert(errorMessage);
    }
  };

  const handleUnblockClick = (id: string, userName: string) => {
    setSelectedUserId(id);
    setSelectedUserName(userName);
    setUnblockModalOpen(true);
  };

  const handleUnblockConfirm = async () => {
    if (!selectedUserId) return;

    try {
      await adminAPI.unblockUser(selectedUserId);
      await loadUsers();
      setUnblockModalOpen(false);
      setSelectedUserId(null);
      setSelectedUserName('');
    } catch (err) {
      console.error('Failed to unblock user', err);
      alert('Не удалось разблокировать пользователя');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const handleDeleteIdea = (idea: Idea) => {
    setIdeaToDelete(idea);
    setDeleteIdeaModalOpen(true);
  };

  const handleDeleteIdeaConfirm = async () => {
    if (!ideaToDelete) return;

    try {
      await ideaAPI.deleteIdea(ideaToDelete.id);
      await loadIdeas();
      await loadComments();
      setDeleteIdeaModalOpen(false);
      setIdeaToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete idea', err);
      const errorMessage = err.response?.data?.message || 'Не удалось удалить идею';
      alert(errorMessage);
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    setCommentToDelete(comment);
    setDeleteCommentModalOpen(true);
  };

  const handleDeleteCommentConfirm = async () => {
    if (!commentToDelete) return;

    try {
      await ideaAPI.deleteCommentAsAdmin(commentToDelete.id);
      await loadComments();
      setDeleteCommentModalOpen(false);
      setCommentToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete comment', err);
      const errorMessage = err.response?.data?.message || 'Не удалось удалить комментарий';
      alert(errorMessage);
    }
  };

  const toggleIdeaComments = (ideaId: string) => {
    setExpandedIdeaId(expandedIdeaId === ideaId ? null : ideaId);
  };

  const getCommentsForIdea = (ideaId: string) => {
    if (!comments || comments.length === 0) {
      return [];
    }
    
    const filtered = comments.filter(comment => {
      if (!comment || !comment.idea) {
        return false;
      }
      // Приводим к строке для надежного сравнения и убираем пробелы
      const commentIdeaId = String(comment.idea.id || '').trim();
      const targetIdeaId = String(ideaId || '').trim();
      return commentIdeaId === targetIdeaId;
    });
    
    return filtered;
  };

  const renderUsersTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Пользователи</h2>
      </div>

      {usersLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем пользователей...</p>
        </div>
      ) : users.length === 0 ? (
        <p>Пользователи пока не найдены.</p>
      ) : (
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Имя</th>
                <th>Статус</th>
                <th>Причина блокировки</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>
                    <span className={`status-badge status-${u.status.toLowerCase()}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    {u.blockInfo?.blockReason ? (
                      <span className="block-reason-text">{u.blockInfo.blockReason}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="users-table__actions">
                    {u.status === 'blocked' || u.status === 'BLOCKED' ? (
                      <button
                        className="cta-button secondary"
                        onClick={() => handleUnblockClick(u.id, `${u.firstName} ${u.lastName}`)}
                      >
                        Разблокировать
                      </button>
                    ) : u.role === 'admin' || u.role === 'ADMIN' ? (
                      <span className="admin-protected-badge">Администратор</span>
                    ) : (
                      <button
                        className="cta-button danger"
                        onClick={() => handleBlockClick(u.id, `${u.firstName} ${u.lastName}`)}
                      >
                        Заблокировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSupportTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Сообщения поддержки</h2>
      </div>

      {supportLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем сообщения...</p>
        </div>
      ) : supportMessages.length === 0 ? (
        <p>Сообщений пока нет.</p>
      ) : (
        <div className="support-messages-list">
          {supportMessages.map((msg) => (
            <div key={msg.id} className={`support-message-card ${msg.isRead ? 'read' : 'unread'}`}>
              <div className="support-message-header">
                <div>
                  <strong>{msg.userName}</strong>
                  <span className="support-message-email">{msg.userEmail}</span>
                </div>
                <div className="support-message-meta">
                  <span className="support-message-date">
                    {new Date(msg.createdAt).toLocaleString('ru-RU')}
                  </span>
                  {!msg.isRead && (
                    <span className="unread-badge">Новое</span>
                  )}
                </div>
              </div>
              
              {msg.blockReason && (
                <div className="support-block-reason">
                  <strong>Причина блокировки:</strong> {msg.blockReason}
                </div>
              )}
              
              <div className="support-message-content">
                {msg.message}
              </div>
              
              {!msg.isRead && (
                <button
                  className="cta-button secondary"
                  onClick={() => handleMarkAsRead(msg.id)}
                  style={{ marginTop: '1rem' }}
                >
                  Отметить как прочитанное
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTopicsTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Темы для обсуждения</h2>
       
        <button
          className="cta-button"
          onClick={handleCreateTopic}
          style={{ marginTop: '1rem' }}
        >
          + Создать тему для обсуждения
        </button>
      </div>

      {topicsLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем темы...</p>
        </div>
      ) : topics.length === 0 ? (
        <p>Тем для обсуждения пока нет.</p>
      ) : (
        <div className="table-wrapper topics-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th>Статус</th>
                <th>Приватность</th>
                <th>Дедлайн</th>
                <th>Идей</th>
                <th>Автор</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td>
                    <strong>{topic.title}</strong>
                  </td>
                  <td>
                    <div className="topic-description">
                      {topic.description.length > 100
                        ? `${topic.description.substring(0, 100)}...`
                        : topic.description}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${topic.status.toLowerCase()}`}>
                      {topic.status}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${topic.privacy.toLowerCase()}`}>
                      {topic.privacy === 'public' ? 'Публичный' : topic.privacy === 'private' ? 'Приватный' : topic.privacy}
                    </span>
                  </td>
                  <td>
                    {topic.deadline ? (
                      <span className={new Date(topic.deadline) < new Date() ? 'deadline-expired' : ''}>
                        {new Date(topic.deadline).toLocaleDateString('ru-RU')}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{topic.ideaCount}</td>
                  <td>
                    {topic.createdBy 
                      ? `${topic.createdBy.firstName} ${topic.createdBy.lastName}`
                      : topic.author 
                        ? `${topic.author.firstName} ${topic.author.lastName}`
                        : 'Неизвестен'}
                  </td>
                  <td className="users-table__actions">
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="cta-button secondary"
                        onClick={() => handleEditTopic(topic)}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                      >
                        Редактировать
                      </button>
                      <button
                        className="cta-button danger"
                        onClick={() => handleDeleteTopic(topic)}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

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

  // Функции для работы с идеями во вкладке Idea Flow
  const fetchFlowIdeas = async (topicId: string) => {
    try {
      setFlowIdeasLoading(true);
      const response = await ideaAPI.getIdeasByTopic(topicId);
      const ideasData = Array.isArray(response.data) ? response.data : response.data?.ideas || [];
      setFlowIdeas(ideasData);
      
      // Загружаем реакции пользователя для каждой идеи
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
      setFlowUserReactions(reactions);
    } catch (err: any) {
      console.error('Failed to fetch ideas:', err);
      setFlowIdeas([]);
    } finally {
      setFlowIdeasLoading(false);
    }
  };

  const handleFlowLike = async (ideaId: string) => {
    try {
      const currentReaction = flowUserReactions[ideaId];
      await ideaAPI.likeIdea(ideaId);
      
      const newReactions = { ...flowUserReactions };
      if (currentReaction === 'like') {
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'like';
      }
      setFlowUserReactions(newReactions);
      
      if (selectedTopicForFlow) {
        await fetchFlowIdeas(selectedTopicForFlow.id);
      }
    } catch (err: any) {
      console.error('Failed to like idea:', err);
      alert(err.response?.data?.message || 'Не удалось поставить лайк');
    }
  };

  const handleFlowDislike = async (ideaId: string) => {
    try {
      const currentReaction = flowUserReactions[ideaId];
      await ideaAPI.dislikeIdea(ideaId);
      
      const newReactions = { ...flowUserReactions };
      if (currentReaction === 'dislike') {
        newReactions[ideaId] = null;
      } else {
        newReactions[ideaId] = 'dislike';
      }
      setFlowUserReactions(newReactions);
      
      if (selectedTopicForFlow) {
        await fetchFlowIdeas(selectedTopicForFlow.id);
      }
    } catch (err: any) {
      console.error('Failed to dislike idea:', err);
      alert(err.response?.data?.message || 'Не удалось поставить дизлайк');
    }
  };

  const handleFlowImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите файлы изображений');
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;
    const validFiles = imageFiles.filter(file => {
      if (file.size > maxFileSize) {
        alert(`Файл "${file.name}" слишком большой (максимум 5MB). Он будет пропущен.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const maxImages = 5;
    const filesToAdd = validFiles.slice(0, maxImages - selectedImages.length);
    
    if (validFiles.length > filesToAdd.length) {
      alert(`Можно загрузить максимум ${maxImages} изображений`);
    }

    setSelectedImages(prev => [...prev, ...filesToAdd]);

    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFlowImage = (index: number) => {
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

  const handleFlowCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() || !selectedTopicForFlow) {
      return;
    }

    setIsSubmittingIdea(true);
    try {
      const imageBase64 = selectedImages.length > 0 
        ? await convertImagesToBase64(selectedImages)
        : undefined;

      await ideaAPI.createIdea({
        title: newIdeaTitle.trim(),
        description: newIdeaTitle.trim(),
        topicId: selectedTopicForFlow.id,
        images: imageBase64,
      });
      setNewIdeaTitle('');
      setSelectedImages([]);
      setImagePreviews([]);
      const fileInput = document.getElementById('flow-idea-images') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      await fetchFlowIdeas(selectedTopicForFlow.id);
      await loadTopics(); // Обновляем счетчик идей
    } catch (err: any) {
      console.error('Failed to create idea:', err);
      alert(err.response?.data?.message || 'Не удалось добавить идею');
    } finally {
      setIsSubmittingIdea(false);
    }
  };

  const renderIdeaFlowTab = () => {
    // Если выбрана тема, показываем детальный просмотр
    if (selectedTopicForFlow) {
      return (
        <div className="admin-section">
          <div className="admin-section__header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                setSelectedTopicForFlow(null);
                setFlowIdeas([]);
                setNewIdeaTitle('');
                setSelectedImages([]);
                setImagePreviews([]);
              }}
              className="cta-button secondary"
              style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
            >
              ← Назад к темам
            </button>
            <div>
              <h2>{selectedTopicForFlow.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {selectedTopicForFlow.description}
              </p>
            </div>
          </div>

          {/* Форма добавления идеи */}
          <div style={{ 
            background: 'var(--bg-primary)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '1.5rem', 
            marginTop: '1.5rem' 
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Добавить идею</h3>
            <form onSubmit={handleFlowCreateIdea}>
              <input
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                placeholder="Введите вашу идею..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                  fontSize: '1rem',
                  marginBottom: '1rem'
                }}
                disabled={isSubmittingIdea}
              />
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="flow-idea-images" style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <span>📷</span>
                  <span>Добавить изображения (макс. 5)</span>
                  <input
                    id="flow-idea-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFlowImageSelect}
                    disabled={isSubmittingIdea || selectedImages.length >= 5}
                    style={{ display: 'none' }}
                  />
                </label>
                
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          style={{ 
                            width: '100px', 
                            height: '100px', 
                            objectFit: 'cover', 
                            borderRadius: 'var(--border-radius)' 
                          }} 
                        />
                        <button
                          type="button"
                          onClick={() => removeFlowImage(index)}
                          disabled={isSubmittingIdea}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1'
                          }}
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
                disabled={!newIdeaTitle.trim() || isSubmittingIdea}
              >
                {isSubmittingIdea ? 'Добавление...' : 'Добавить идею'}
              </button>
            </form>
          </div>

          {/* Список идей */}
          <div style={{ marginTop: '2rem' }}>
            <h3>Идеи ({flowIdeas.length})</h3>
            {flowIdeasLoading ? (
              <div className="loading-container" style={{ minHeight: '200px' }}>
                <div className="loading-spinner"></div>
                <p>Загрузка идей...</p>
              </div>
            ) : flowIdeas.length === 0 ? (
              <div className="empty-state">
                <p>Пока нет идей. Будьте первым, кто предложит идею!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {flowIdeas
                  .filter((idea) => idea.id)
                  .map((idea) => (
                    <div 
                      key={idea.id} 
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>{idea.title}</h4>
                          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                            {idea.author?.firstName} {idea.author?.lastName} • {formatDate(idea.createdAt)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className={`cta-button ${flowUserReactions[idea.id] === 'like' ? 'primary' : 'secondary'}`}
                            onClick={() => handleFlowLike(idea.id)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            👍 {idea.likes}
                          </button>
                          <button
                            className={`cta-button ${flowUserReactions[idea.id] === 'dislike' ? 'primary' : 'secondary'}`}
                            onClick={() => handleFlowDislike(idea.id)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            👎 {idea.dislikes}
                          </button>
                        </div>
                      </div>
                      
                      {idea.images && idea.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {idea.images
                            .filter((image) => image && typeof image === 'string' && image.length > 100)
                            .map((image, index) => {
                              let imageSrc = image.trim();
                              if (!imageSrc.startsWith('data:image')) {
                                const cleanBase64 = imageSrc.replace(/\s/g, '');
                                let mimeType = 'jpeg';
                                if (cleanBase64.startsWith('iVBOR')) mimeType = 'png';
                                else if (cleanBase64.startsWith('/9j/')) mimeType = 'jpeg';
                                imageSrc = `data:image/${mimeType};base64,${cleanBase64}`;
                              }
                              return (
                                <img
                                  key={index}
                                  src={imageSrc}
                                  alt={`${idea.title} - изображение ${index + 1}`}
                                  style={{
                                    maxWidth: '200px',
                                    maxHeight: '200px',
                                    borderRadius: 'var(--border-radius)',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              );
                            })}
                        </div>
                      )}
                      
                      <CommentSection ideaId={idea.id} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Показываем список тем
    return (
      <div className="admin-section">
        <div className="admin-section__header">
          <h2>Idea Flow</h2>
        
        </div>

        {topicsLoading ? (
          <div className="loading-container" style={{ minHeight: '200px' }}>
            <div className="loading-spinner"></div>
            <p>Загружаем темы...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="empty-state">
            <p>Тем для обсуждения пока нет.</p>
          </div>
        ) : (
          <div className="topics-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem',
            marginTop: '1rem'
          }}>
            {topics.map((topic) => (
              <div 
                key={topic.id} 
                className="topic-card"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: '1.5rem',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  minHeight: '220px',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedTopicForFlow(topic);
                  fetchFlowIdeas(topic.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  margin: 0, 
                  flex: 1,
                  lineHeight: 1.4,
                  wordWrap: 'break-word'
                }}>
                  {topic.title}
                </h3>
                {topic.deadline && (
                  <span style={{
                    fontSize: '0.85rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: new Date(topic.deadline) < new Date() ? '#f8d7da' : '#fff3cd',
                    color: new Date(topic.deadline) < new Date() ? '#721c24' : '#856404',
                    whiteSpace: 'nowrap',
                    fontWeight: 500
                  }}>
                    {formatDeadline(topic.deadline) || 'Истек'}
                  </span>
                )}
              </div>
              <p style={{ 
                color: 'var(--text-secondary)', 
                lineHeight: 1.6, 
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flex: 1,
                minHeight: '80px'
              }}>
                {topic.description}
              </p>
              <div style={{ 
                marginTop: 'auto', 
                paddingTop: '1rem', 
                borderTop: '1px solid var(--border-color)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem', 
                  fontSize: '0.9rem',
                  marginTop: '0.5rem'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Автор: {topic.createdBy 
                      ? `${topic.createdBy.firstName} ${topic.createdBy.lastName}`
                      : topic.author 
                        ? `${topic.author.firstName} ${topic.author.lastName}`
                        : 'Неизвестен'}
                  </span>
                  {topic.createdAt && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Создан: {formatDate(topic.createdAt)}
                    </span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      Идей: {topic.ideaCount || 0}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        backgroundColor: topic.status === 'approved' ? '#d4edda' : 
                                       topic.status === 'pending' ? '#fff3cd' : 
                                       topic.status === 'rejected' ? '#f8d7da' : '#e2e3e5',
                        color: topic.status === 'approved' ? '#155724' : 
                               topic.status === 'pending' ? '#856404' : 
                               topic.status === 'rejected' ? '#721c24' : '#383d41'
                      }}>
                        {topic.status === 'approved' ? 'Одобрена' : 
                         topic.status === 'pending' ? 'Ожидает' : 
                         topic.status === 'rejected' ? 'Отклонена' : topic.status}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        backgroundColor: topic.privacy === 'public' ? '#d1ecf1' : '#f8d7da',
                        color: topic.privacy === 'public' ? '#0c5460' : '#721c24'
                      }}>
                        {topic.privacy === 'public' ? 'Публичная' : 'Приватная'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  const renderIdeasTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Идеи и комментарии</h2>
        
      </div>

      {ideasLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем идеи...</p>
        </div>
      ) : ideas.length === 0 ? (
        <p>Идей пока нет.</p>
      ) : (
        <div className="table-wrapper ideas-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Автор</th>
                <th>Тема</th>
                <th>Лайки</th>
                <th>Дизлайки</th>
                <th>Рейтинг</th>
                <th>Комментарии</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => {
                const ideaComments = getCommentsForIdea(idea.id);
                const isExpanded = expandedIdeaId === idea.id;
                return (
                  <React.Fragment key={idea.id}>
                    <tr>
                      <td>
                        <strong>{idea.title}</strong>
                      </td>
                      <td>
                        {idea.author?.firstName} {idea.author?.lastName}
                      </td>
                      <td>
                        {idea.topic ? (
                          <span className={`status-badge status-${idea.topic.status?.toLowerCase() || 'unknown'}`}>
                            {idea.topic.title || 'Без темы'}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>{idea.likes}</td>
                      <td>{idea.dislikes}</td>
                      <td>
                        <span style={{ 
                          color: idea.rating >= 0 ? '#28a745' : '#dc3545',
                          fontWeight: 600 
                        }}>
                          {idea.rating >= 0 ? '+' : ''}{idea.rating}
                        </span>
                      </td>
                      <td>
                        <button
                          className="cta-button secondary"
                          onClick={() => toggleIdeaComments(idea.id)}
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                          {isExpanded ? 'Скрыть' : 'Показать'} ({ideaComments.length || idea.commentCount || 0})
                        </button>
                      </td>
                      <td>
                        {new Date(idea.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="users-table__actions">
                        <button
                          className="cta-button danger"
                          onClick={() => handleDeleteIdea(idea)}
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Комментарии к идее:</h4>
                            {commentsLoading ? (
                              <div className="loading-container" style={{ minHeight: '100px' }}>
                                <div className="loading-spinner"></div>
                                <p>Загружаем комментарии...</p>
                              </div>
                            ) : ideaComments.length === 0 ? (
                              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Комментариев пока нет
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {ideaComments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    style={{
                                      padding: '1rem',
                                      backgroundColor: 'var(--bg-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--border-radius)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      gap: '1rem'
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div style={{ 
                                        display: 'flex', 
                                        gap: '0.5rem', 
                                        alignItems: 'center',
                                        marginBottom: '0.5rem'
                                      }}>
                                        <strong>
                                          {comment.author.firstName} {comment.author.lastName}
                                        </strong>
                                        <span style={{ 
                                          color: 'var(--text-secondary)', 
                                          fontSize: '0.85rem' 
                                        }}>
                                          {new Date(comment.createdAt).toLocaleString('ru-RU')}
                                        </span>
                                      </div>
                                      <p style={{ 
                                        margin: 0, 
                                        color: 'var(--text-primary)',
                                        lineHeight: 1.6
                                      }}>
                                        {comment.content}
                                      </p>
                                      <div style={{ 
                                        marginTop: '0.5rem', 
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)'
                                      }}>
                                        Тема: {comment.idea?.topic?.title || 'Без темы'}
                                      </div>
                                    </div>
                                    <button
                                      className="cta-button danger"
                                      onClick={() => handleDeleteComment(comment)}
                                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="dashboard-message">
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Ошибка</h3>
        <p>{error}</p>
        <button className="cta-button primary" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }


  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          {isAdmin ? (
            <>
              <div className="header-content admin-header">
                <h1 className="dashboard-title">System Administrator</h1>
              </div>
              <div className="admin-tabs-wrapper">
                <div className="admin-tabs">
                  {[
                    { key: 'users', label: 'Пользователи' },
                    { key: 'support', label: 'Поддержка' },
                    { key: 'topics', label: 'Темы' },
                    { key: 'ideas', label: 'Идеи' },
                    { key: 'ideaflow', label: 'Idea flow' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.key as AdminTab)}
                    >
                      {tab.label}
                      {tab.key === 'support' && supportMessages.filter(m => !m.isRead).length > 0 && (
                        <span className="tab-badge">{supportMessages.filter(m => !m.isRead).length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <div className="header-content">
              <h1 className="dashboard-title">
                Добро пожаловать в IdeaFlow, {user.firstName}!
              </h1>
              <div className="header-user-info">
                <span className="user-name">{user.firstName} {user.lastName}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className={`container ${isAdmin ? 'admin-container' : ''}`}>
          <div className="dashboard-welcome fade-in">
            <div className="welcome-card">
              {isAdmin ? (
                <>
                  {activeTab === 'users' && renderUsersTab()}
                  {activeTab === 'support' && renderSupportTab()}
                  {activeTab === 'topics' && renderTopicsTab()}
                  {activeTab === 'ideas' && renderIdeasTab()}
                  {activeTab === 'ideaflow' && renderIdeaFlowTab()}
                </>
              ) : (
                <>
              <h2>Ваш профиль</h2>
              <div className="profile-info">
                <div className="info-item">
                  <span className="info-label">Имя:</span>
                  <span className="info-value">{user.firstName} {user.lastName}</span>
                </div>
                {user.email && (
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Статус аккаунта:</span>
                  <span className={`status-badge status-${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="dashboard-footer">
        <div className="container">
          <p>© 2025 IdeaFlow Dashboard. Версия 1.0</p>
        </div>
      </footer>

      {blockModalOpen && (
        <BlockUserModal
          isOpen={blockModalOpen}
          onClose={() => {
            setBlockModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName('');
          }}
          onConfirm={handleBlockConfirm}
          userName={selectedUserName}
        />
      )}

      {unblockModalOpen && (
        <ConfirmModal
          isOpen={unblockModalOpen}
          onClose={() => {
            setUnblockModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName('');
          }}
          onConfirm={handleUnblockConfirm}
          title="Разблокировка пользователя"
          message={`Вы уверены, что хотите разблокировать пользователя ${selectedUserName}?`}
          confirmText="Разблокировать"
          cancelText="Отмена"
          confirmButtonClass="secondary"
        />
      )}

      {topicModalOpen && (
        <TopicModal
          isOpen={topicModalOpen}
          onClose={() => {
            setTopicModalOpen(false);
            setSelectedTopic(null);
          }}
          onSave={handleTopicSave}
          topic={selectedTopic}
        />
      )}

      {deleteTopicModalOpen && topicToDelete && (
        <ConfirmModal
          isOpen={deleteTopicModalOpen}
          onClose={() => {
            setDeleteTopicModalOpen(false);
            setTopicToDelete(null);
          }}
          onConfirm={handleDeleteTopicConfirm}
          title="Удаление темы для обсуждения"
          message={`Вы уверены, что хотите удалить тему "${topicToDelete.title}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmButtonClass="danger"
        />
      )}

      {deleteIdeaModalOpen && ideaToDelete && (
        <ConfirmModal
          isOpen={deleteIdeaModalOpen}
          onClose={() => {
            setDeleteIdeaModalOpen(false);
            setIdeaToDelete(null);
          }}
          onConfirm={handleDeleteIdeaConfirm}
          title="Удаление идеи"
          message={`Вы уверены, что хотите удалить идею "${ideaToDelete.title}"? Это действие нельзя отменить. Все комментарии к этой идее также будут удалены.`}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmButtonClass="danger"
        />
      )}

      {deleteCommentModalOpen && commentToDelete && (
        <ConfirmModal
          isOpen={deleteCommentModalOpen}
          onClose={() => {
            setDeleteCommentModalOpen(false);
            setCommentToDelete(null);
          }}
          onConfirm={handleDeleteCommentConfirm}
          title="Удаление комментария"
          message={`Вы уверены, что хотите удалить комментарий от ${commentToDelete.author.firstName} ${commentToDelete.author.lastName}? Это действие нельзя отменить.`}
          confirmText="Удалить"
          cancelText="Отмена"
          confirmButtonClass="danger"
        />
      )}
    </div>
  );
};

export default Dashboard;