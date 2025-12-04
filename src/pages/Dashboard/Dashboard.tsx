import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, authAPI, adminAPI, topicAPI, ideaAPI } from '../../api';
import BlockUserModal from '../../components/Modals/BlockUserModal';
import ConfirmModal from '../../components/Modals/ConfirmModal';
import TopicModal from '../../components/Modals/TopicModal';
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
  likes: number;
  dislikes: number;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  topic: {
    title: string;
    status: string;
  };
  commentCount?: number;
}

interface Comment {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
  };
  parentId: string | null;
  createdAt: string;
  ideaId?: string;
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
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());
  const [ideaComments, setIdeaComments] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
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
      } else if (activeTab === 'ideas') {
        loadIdeas();
      } else if (activeTab === 'ideaflow') {
        loadTopics(); 
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

  const loadIdeas = async () => {
    setIdeasLoading(true);
    try {
      const response = await ideaAPI.getAllIdeas();
      setIdeas(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load ideas', err);
      setError('Не удалось загрузить список идей');
    } finally {
      setIdeasLoading(false);
    }
  };

  const loadCommentsForIdea = async (ideaId: string) => {
    setCommentsLoading(prev => ({ ...prev, [ideaId]: true }));
    try {
      const response = await ideaAPI.getComments(ideaId);
      const commentsData = Array.isArray(response.data) ? response.data : [];
      // Добавляем ideaId к каждому комментарию для возможности удаления
      const commentsWithIdeaId = commentsData.map((comment: Comment) => ({
        ...comment,
        ideaId,
      }));
      setIdeaComments(prev => ({ ...prev, [ideaId]: commentsWithIdeaId }));
    } catch (err: any) {
      console.error('Failed to load comments', err);
      setIdeaComments(prev => ({ ...prev, [ideaId]: [] }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [ideaId]: false }));
    }
  };

  const toggleIdeaExpansion = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
      if (!ideaComments[ideaId]) {
        loadCommentsForIdea(ideaId);
      }
    }
    setExpandedIdeas(newExpanded);
  };

  const handleDeleteIdea = (idea: Idea) => {
    setIdeaToDelete(idea);
    setDeleteIdeaModalOpen(true);
  };

  const handleDeleteIdeaConfirm = async () => {
    if (!ideaToDelete) return;

    try {
      await ideaAPI.adminDeleteIdea(ideaToDelete.id);
      await loadIdeas();
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
      await ideaAPI.deleteComment(commentToDelete.id);
      if (commentToDelete.ideaId) {
        await loadCommentsForIdea(commentToDelete.ideaId);
      }
      setDeleteCommentModalOpen(false);
      setCommentToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete comment', err);
      const errorMessage = err.response?.data?.message || 'Не удалось удалить комментарий';
      alert(errorMessage);
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

  const renderIdeaFlowTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Idea Flow</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Просмотр всех тем для обсуждения в виде карточек
        </p>
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

  const renderIdeasTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Идеи пользователей</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Просмотр и управление идеями пользователей к опубликованным темам
        </p>
      </div>

      {ideasLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем идеи...</p>
        </div>
      ) : ideas.length === 0 ? (
        <div className="empty-state">
          <p>Идей пока нет.</p>
        </div>
      ) : (
        <div className="ideas-admin-list">
          {ideas.map((idea) => {
            const isExpanded = expandedIdeas.has(idea.id);
            const comments = ideaComments[idea.id] || [];
            const isLoadingComments = commentsLoading[idea.id];

            return (
              <div key={idea.id} className="idea-admin-card">
                <div className="idea-admin-header">
                  <div className="idea-admin-main">
                    <h3 className="idea-admin-title">{idea.title}</h3>
                    <div className="idea-admin-meta">
                      <span className="idea-admin-author">
                        Автор: {idea.author.firstName} {idea.author.lastName}
                      </span>
                      <span className="idea-admin-topic">
                        Тема: {idea.topic.title}
                      </span>
                      <span className="idea-admin-date">
                        {new Date(idea.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="idea-admin-stats">
                      <span>👍 {idea.likes}</span>
                      <span>👎 {idea.dislikes}</span>
                      <span>💬 {idea.commentCount || 0}</span>
                    </div>
                  </div>
                  <div className="idea-admin-actions">
                    <button
                      className="cta-button secondary"
                      onClick={() => toggleIdeaExpansion(idea.id)}
                    >
                      {isExpanded ? 'Скрыть комментарии' : 'Показать комментарии'}
                    </button>
                    <button
                      className="cta-button danger"
                      onClick={() => handleDeleteIdea(idea)}
                    >
                      Удалить идею
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="idea-admin-comments">
                    {isLoadingComments ? (
                      <div className="loading-container" style={{ padding: '1rem' }}>
                        <div className="loading-spinner"></div>
                        <p>Загружаем комментарии...</p>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="empty-comments">
                        <p>Комментариев пока нет.</p>
                      </div>
                    ) : (
                      <div className="comments-admin-list">
                        {comments.map((comment) => (
                          <div key={comment.id} className="comment-admin-item">
                            <div className="comment-admin-content">
                              <div className="comment-admin-header">
                                <span className="comment-admin-author">
                                  {comment.author.firstName} {comment.author.lastName}
                                </span>
                                <span className="comment-admin-date">
                                  {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="comment-admin-text">{comment.content}</p>
                              {comment.parentId && (
                                <span className="comment-reply-badge">Ответ на комментарий</span>
                              )}
                            </div>
                            <button
                              className="cta-button danger small"
                              onClick={() => handleDeleteComment(comment)}
                            >
                              Удалить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          message={`Вы уверены, что хотите удалить идею "${ideaToDelete.title}"? Это действие нельзя отменить.`}
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