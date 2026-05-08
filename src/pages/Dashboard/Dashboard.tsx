import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { profileAPI, authAPI, adminAPI, topicAPI, ideaAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import BlockUserModal from '../../components/Modals/BlockUserModal';
import ConfirmModal from '../../components/Modals/ConfirmModal';
import TopicModal from '../../components/Modals/TopicModal';
import CommentSection from '../../components/CommentSection/CommentSection';
import TopicsListView from '../../components/Topics/TopicsListView';
import DragDropUpload, { UploadFile } from '../../components/DragDropUpload/DragDropUpload';
import SupportTab from './SupportTab';
import UsersTab from './UsersTab';
import { getProfileAchievements } from '../../utils/achievements';
import { AdminTab, AdminUser, Comment, Idea, SupportMessage, Topic, UserProfile } from './types';
import './Dashboard.css';
import '../TopicDetail/TopicDetail.css';

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

  const [editingAdminIdeaId, setEditingAdminIdeaId] = useState<string | null>(null);
  const [adminEditTitle, setAdminEditTitle] = useState('');
  const [isUpdatingAdminIdea, setIsUpdatingAdminIdea] = useState(false);
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
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);
  const [ideaValidationError, setIdeaValidationError] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Admin profile states
  const [adminStats, setAdminStats] = useState({
    ideasCount: 0,
    commentsCount: 0,
    likesReceived: 0,
    likesGiven: 0,
    topicsCount: 0,
    rating: 0,
  });
  const [adminFavoriteTopics, setAdminFavoriteTopics] = useState<Topic[]>([]);
  const [adminFavoritesLoading, setAdminFavoritesLoading] = useState(false);
  const [adminTopicsPreview, setAdminTopicsPreview] = useState<Topic[]>([]);
  const [adminTopicsPreviewLoading, setAdminTopicsPreviewLoading] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setAdminMenuOpen(false);
  }, [activeTab, location.pathname]);

  const getAdminTabs = () => [
    { id: 'users' as AdminTab, label: 'Пользователи' },
    { id: 'support' as AdminTab, label: 'Поддержка' },
    { id: 'topics' as AdminTab, label: 'Темы' },
    { id: 'ideas' as AdminTab, label: 'Идеи' },
    { id: 'ideaflow' as AdminTab, label: 'IdeaFlow' },
  ];

  const isValidAdminTab = (value: string | null): value is AdminTab => {
    if (!value) {
      return false;
    }

    return [...getAdminTabs().map((tab) => tab.id), 'profile'].includes(value as AdminTab);
  };

  const getInitials = () => {
    if (!user) return 'AD';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const startAdminEditingIdea = (idea: Idea) => {
    setEditingAdminIdeaId(idea.id);
    setAdminEditTitle(idea.title || '');
  };

  const cancelAdminEditingIdea = () => {
    setEditingAdminIdeaId(null);
    setAdminEditTitle('');
  };

  const handleAdminUpdateIdea = async (ideaId: string) => {
    try {
      setIsUpdatingAdminIdea(true);
      await ideaAPI.updateIdea(ideaId, {
        title: adminEditTitle.trim(),
      });
      cancelAdminEditingIdea();
      await loadIdeas();
    } catch (err: any) {
      console.error('Failed to update idea as admin:', err);
    } finally {
      setIsUpdatingAdminIdea(false);
    }
  };

  const handleAdminPinIdea = async (ideaId: string) => {
    try {
      await ideaAPI.pinIdea(ideaId);
      if (selectedTopicForFlow) {
        await fetchFlowIdeas(selectedTopicForFlow.id);
      }
      await loadIdeas();
    } catch (err: any) {
      console.error('Failed to pin idea:', err);
    }
  };

  const handleAdminUnpinIdea = async (ideaId: string) => {
    try {
      await ideaAPI.unpinIdea(ideaId);
      if (selectedTopicForFlow) {
        await fetchFlowIdeas(selectedTopicForFlow.id);
      }
      await loadIdeas();
    } catch (err: any) {
      console.error('Failed to unpin idea:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedTab = searchParams.get('tab');

    if (isValidAdminTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search]);

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
      } else if (activeTab === 'profile') {
        fetchAdminStatistics();
        fetchAdminFavoriteTopics();
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

  const fetchAdminStatistics = async () => {
    try {
      const response = await ideaAPI.getUserStatistics();
      const data = response.data;
      setAdminStats({
        ideasCount: data.totalIdeas ?? 0,
        commentsCount: data.totalComments ?? 0,
        likesReceived: data.totalLikes ?? 0,
        likesGiven: data.totalGivenLikes ?? data.likesGiven ?? data.givenLikes ?? 0,
        topicsCount: data.totalTopics ?? Object.keys(data.ideasByTopic || {}).length ?? 0,
        rating: data.averageRating ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch admin statistics:', err);
    }
  };

  const fetchAdminFavoriteTopics = async () => {
    try {
      setAdminFavoritesLoading(true);
      const response = await topicAPI.getFavoriteTopics();
      const data = Array.isArray(response.data) ? response.data : response.data?.topics || [];
      setAdminFavoriteTopics(data.slice(0, 5));
    } catch (err: any) {
      setAdminFavoriteTopics([]);
    } finally {
      setAdminFavoritesLoading(false);
    }
  };

  const fetchAdminTopicsPreview = async () => {
    try {
      setAdminTopicsPreviewLoading(true);
      const response = await adminAPI.getTopicsPreview();
      const data = Array.isArray(response.data) ? response.data : response.data?.topics || [];
      setAdminTopicsPreview(data.slice(0, 5));
    } catch (err: any) {
      setAdminTopicsPreview([]);
    } finally {
      setAdminTopicsPreviewLoading(false);
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
    }
  };

  const handleTopicSave = async (topicData: any) => {
    try {
      if (selectedTopic) {
        await topicAPI.updateTopic(selectedTopic.id, topicData);
      } else {
        const response = await topicAPI.createTopic(topicData);
        // Оптимистичное обновление: добавляем новую тему в список немедленно
        if (response.data) {
          setTopics(prev => [response.data, ...prev]);
        }
      }
      // Загружаем актуальный список для синхронизации
      await loadTopics();
      setTopicModalOpen(false);
      setSelectedTopic(null);
    } catch (err: any) {
      console.error('Failed to save topic', err);
      const errorMessage = err.response?.data?.message || 'Не удалось сохранить тему для обсуждения';
      setError(errorMessage);
      throw err;
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
      const commentIdeaId = String(comment.idea.id || '').trim();
      const targetIdeaId = String(ideaId || '').trim();
      return commentIdeaId === targetIdeaId;
    });

    return filtered;
  };

  const renderAdminProfileTab = () => {
    if (!user) return null;

    const currentUserId = (user as UserProfile & { id?: string }).id;
    const pinnedIdeasCount = currentUserId
      ? ideas.filter((idea) => idea.isPinned && idea.authorId === currentUserId).length
      : 0;
    const commentedTopicsCount = currentUserId
      ? new Set(
          comments
            .filter((comment) => comment.author?.id === currentUserId)
            .map((comment) => comment.idea?.topic?.id)
            .filter(Boolean)
        ).size
      : 0;
    const achievements = getProfileAchievements({
      ideasCount: adminStats.ideasCount,
      commentsCount: adminStats.commentsCount,
      topicsCount: adminStats.topicsCount,
      likesReceived: adminStats.likesReceived,
      likesGiven: adminStats.likesGiven,
      pinnedIdeasCount,
      commentedTopicsCount,
    });

    return (
      <div className="admin-profile-tab">
        <div className="profile-page">
          <div className="profile-header">
            <div className="avatar-sq profile-avatar-large">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div className="profile-main-info">
              <h2>{user.firstName} {user.lastName}</h2>
              <p className="profile-subtitle">{user.email || 'Администратор платформы IdeaFlow'}</p>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-box" data-icon="lightbulb"><label>Идей</label><span>{adminStats.ideasCount}</span></div>
            <div className="stat-box" data-icon="comments"><label>Коммент.</label><span>{adminStats.commentsCount}</span></div>
            <div className="stat-box" data-icon="heart"><label>Лайков</label><span>{adminStats.likesReceived}</span></div>
            <div className="stat-box" data-icon="folder"><label>Темы</label><span>{adminStats.topicsCount}</span></div>
          </div>

          <div className="card">
            <div className="card-title"><h3>Достижения</h3></div>
            <div className="badge-grid">
              {achievements.map((achievement) => (
                <div
                  key={achievement.key}
                  className={`badge-card ${achievement.unlocked ? 'unlocked' : ''}`}
                  title={achievement.description}
                >
                  <i className={achievement.iconClass}></i>
                  <div>{achievement.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title card-title-with-action">
              <h3>Избранные темы</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('topics')}>
                К темам →
              </button>
            </div>
            {adminFavoritesLoading ? (
              <div className="loading-container" style={{ padding: '1rem' }}>
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
              </div>
            ) : adminFavoriteTopics.length === 0 ? (
              <div className="empty-state">
                <p>В избранном пока нет тем.</p>
              </div>
            ) : (
              <div className="favorite-topics-list">
                {adminFavoriteTopics.slice(0, 5).map((topic) => (
                  <div 
                    key={topic.id} 
                    className="fav-topic-item"
                    onClick={() => navigate(`/topic/${topic.id}`)}
                  >
                    <span>
                      <i className="fas fa-star"></i>
                      {topic.title || 'Без названия'}
                    </span>
                    <small>{topic.ideaCount || 0} идей</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTopicsTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Темы для обсуждения</h2>
       
        <button
          onClick={handleCreateTopic}
          className="cta-button admin-create-topic-btn"
        >
          + Создать тему для обсуждения
        </button>
      </div>

      {topicsLoading ? (
        <div className="loading-container admin-loading-block">
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
                    ) : null}
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
                    <div className="admin-action-row">
                      <button
                        onClick={() => handleEditTopic(topic)}
                        className="cta-button secondary admin-btn-compact"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic)}
                        className="cta-button danger admin-btn-compact"
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

  const isTopicCompleted = (topic: Topic): boolean => {
    if (!topic.deadline) return false;
    const deadlineDate = new Date(topic.deadline);
    const now = new Date();
    return deadlineDate < now;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDeadline = (deadline: string | null): string | null => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    return deadlineDate.toLocaleDateString('ru-RU');
  };

  const getTopicTagLabel = (topic: Topic): string => {
    if (topic.status?.toLowerCase() === 'approved') {
      return 'Активна';
    }

    if (!topic.deadline) {
      return '';
    }

    const deadlineDate = new Date(topic.deadline);
    const now = new Date();
    const formattedDate = formatDeadline(topic.deadline) || '';

    if (deadlineDate < now) {
      return `Завершено: ${formattedDate}`;
    }

    return formattedDate;
  };

  const activeTopics = topics.filter((t) => !isTopicCompleted(t));
  const completedTopics = topics.filter((t) => isTopicCompleted(t));

  const fetchFlowIdeas = async (topicId: string) => {
    try {
      setFlowIdeasLoading(true);
      const response = await ideaAPI.getIdeasByTopic(topicId);
      const ideasData = Array.isArray(response.data) ? response.data : response.data?.ideas || [];
      setFlowIdeas(ideasData);
      
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
    }
  };

  const handleFlowFilesSelected = (files: UploadFile[]) => {

    setUploadFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const newFiles = files.filter(f => !existingIds.has(f.id));
      return [...prev, ...newFiles].slice(0, 5);
    });
  };

  const handleFlowFileRemove = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
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
  
  // Валидация
  if (!newIdeaTitle.trim()) {
    setIdeaValidationError('Поле "идея" не может быть пустым');
    // Добавляем анимацию к полю ввода
    const input = document.querySelector('input[type="text"]');
    if (input) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
    }
    return;
  }
  
  if (newIdeaTitle.trim().length < 15) {
    setIdeaValidationError('Идея должна содержать минимум 15 символов');
    // Добавляем анимацию к полю ввода
    const input = document.querySelector('input[type="text"]');
    if (input) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
    }
    return;
  }
  
  if (!selectedTopicForFlow) {
    return;
  }

  setIsSubmittingIdea(true);
  setIdeaValidationError('');
  
  try {
    const imageBase64 = uploadFiles.length > 0 
      ? await convertImagesToBase64(uploadFiles.map(uf => uf.file))
      : undefined;

    await ideaAPI.createIdea({
      title: newIdeaTitle.trim(),
      topicId: selectedTopicForFlow.id,
      images: imageBase64,
    });
    setNewIdeaTitle('');
    setUploadFiles([]);
    await fetchFlowIdeas(selectedTopicForFlow.id);
    await loadTopics();
  } catch (err: any) {
    console.error('Failed to create idea:', err);
    setIdeaValidationError('Тема закрыта.');
  } finally {
    setIsSubmittingIdea(false);
  }
};

  const renderIdeaFlowTab = () => {
    if (selectedTopicForFlow) {
      const isCompleted = isTopicCompleted(selectedTopicForFlow);

      return (
        <div className="topic-detail" style={{ padding: 0, background: 'transparent' }}>
          <div className="topic-detail-content" style={{ padding: 0 }}>
            <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
              <div className="back-nav">
                <span
                  className="back-link"
                  onClick={() => {
                    setSelectedTopicForFlow(null);
                    setFlowIdeas([]);
                    setNewIdeaTitle('');
                    setUploadFiles([]);
                  }}
                >
                  <i className="fas fa-arrow-left"></i> Ко всем темам
                </span>
              </div>

              <div className="card topic-header">
                <div className="topic-title">{selectedTopicForFlow.title}</div>
                <div className="topic-description">{selectedTopicForFlow.description}</div>
                <div className="topic-stats">
                  <span className="topic-stat">
                    <i className="far fa-lightbulb"></i> {selectedTopicForFlow.ideaCount || 0} идей
                  </span>
                  {selectedTopicForFlow.deadline && (
                    <span className="tag">
                      <i className="far fa-calendar"></i>{' '}
                      {isCompleted
                        ? `Завершено: ${formatDeadline(selectedTopicForFlow.deadline)}`
                        : `До: ${formatDeadline(selectedTopicForFlow.deadline)}`}
                    </span>
                  )}
                  {selectedTopicForFlow.createdBy && (
                    <span className="topic-stat">
                      <i className="far fa-user"></i> {selectedTopicForFlow.createdBy.firstName}{' '}
                      {selectedTopicForFlow.createdBy.lastName}
                    </span>
                  )}
                </div>
              </div>

              {!isCompleted && (
                <div className="add-idea-bar">
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      document.querySelector('.add-idea-section')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    <i className="fas fa-plus"></i> Предложить идею
                  </button>
                </div>
              )}

              {!isCompleted && (
                <div className="card add-idea-section">
                  <div className="card-title">
                    <h3>Добавить идею</h3>
                  </div>
                  <form onSubmit={handleFlowCreateIdea} className="add-idea-form">
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
                      disabled={isSubmittingIdea}
                      style={{
                        border: ideaValidationError
                          ? '1px solid #dc3545'
                          : '1px solid var(--border)',
                        marginBottom: ideaValidationError ? '0.5rem' : '1rem',
                      }}
                    />

                    {ideaValidationError && (
                      <div
                        style={{
                          color: '#dc3545',
                          fontSize: '0.875rem',
                          marginBottom: '1rem',
                          padding: '0.5rem',
                          backgroundColor: '#f8d7da',
                          border: '1px solid #f5c6cb',
                          borderRadius: '4px',
                        }}
                      >
                        {ideaValidationError}
                      </div>
                    )}

                    <div className="image-upload-section">
                      <DragDropUpload
                        maxFiles={5}
                        maxFileSize={10 * 1024 * 1024}
                        acceptedFormats={['image/jpeg', 'image/png', 'image/jpg']}
                        onFilesSelected={handleFlowFilesSelected}
                        onFileRemove={handleFlowFileRemove}
                        existingFiles={uploadFiles}
                        disabled={isSubmittingIdea || uploadFiles.length >= 5}
                        label="Перетащите изображения сюда или нажмите для выбора"
                        key={uploadFiles.length === 0 ? 'empty' : 'filled'}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        !newIdeaTitle.trim() ||
                        newIdeaTitle.trim().length < 15 ||
                        isSubmittingIdea
                      }
                    >
                      {isSubmittingIdea ? 'Добавление...' : 'Добавить идею'}
                    </button>
                  </form>
                </div>
              )}

              <div className="ideas-list-wrapper">
                {flowIdeasLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Загрузка идей...</p>
                  </div>
                ) : flowIdeas.length === 0 ? (
                  <div className="empty-state">
                    <p>Пока нет идей. Будьте первым, кто предложит идею!</p>
                  </div>
                ) : (
                  <div className="ideas-list" id="ideas-list">
                    {flowIdeas
                      .filter((idea) => idea.id)
                      .map((idea) => (
                        <div key={idea.id} className="idea-card-full">
                          <div className="idea-main">
                            {editingAdminIdeaId === idea.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                  type="text"
                                  value={adminEditTitle}
                                  onChange={(e) => setAdminEditTitle(e.target.value)}
                                  className="idea-input"
                                  disabled={isUpdatingAdminIdea}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleAdminUpdateIdea(idea.id)}
                                    disabled={
                                      isUpdatingAdminIdea ||
                                      !adminEditTitle.trim() ||
                                      adminEditTitle.trim().length < 15
                                    }
                                  >
                                    {isUpdatingAdminIdea ? 'Сохранение...' : 'Сохранить'}
                                  </button>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={cancelAdminEditingIdea}
                                    disabled={isUpdatingAdminIdea}
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="idea-header-row">
                                  <div className="idea-name">
                                    {idea.isPinned && (
                                      <span title="Закреплено" className="pin-icon">
                                        <i className="fas fa-thumbtack"></i>
                                      </span>
                                    )}
                                    {idea.title}
                                  </div>
                                  <button
                                    className={`idea-like-right ${
                                      flowUserReactions[idea.id] === 'like' ? 'liked' : ''
                                    }`}
                                    onClick={() => handleFlowLike(idea.id)}
                                  >
                                    <i
                                      className={
                                        flowUserReactions[idea.id] === 'like'
                                          ? 'fas fa-heart'
                                          : 'far fa-heart'
                                      }
                                    >
                                    </i>
                                    <span>{idea.likes}</span>
                                  </button>
                                </div>

                                {idea.images && idea.images.length > 0 && (
                                  <div className="idea-images">
                                    {idea.images
                                      .filter((image) => {
                                        if (!image || typeof image !== 'string' || image.length < 100) {
                                          return false;
                                        }
                                        return (
                                          image.startsWith('data:image') ||
                                          /^[A-Za-z0-9+/=]+$/.test(image.substring(0, 100)) ||
                                          image.startsWith('/9j/') ||
                                          image.startsWith('iVBORw0KGgo')
                                        );
                                      })
                                      .map((image, index) => {
                                        let imageSrc = image.trim();

                                        try {
                                          if (imageSrc.startsWith('data:image')) {
                                            const correctFormat =
                                              /^data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=\s]+)$/;
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
                                                } else if (
                                                  lowerSrc.includes('jpeg') ||
                                                  lowerSrc.includes('jpg') ||
                                                  base64Data.startsWith('/9j/') ||
                                                  base64Data.startsWith('FFD8')
                                                ) {
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
                                                console.error(
                                                  'Failed to load image at index',
                                                  index,
                                                  'Length:',
                                                  imageSrc.length
                                                );
                                                console.error(
                                                  'Image preview (first 100 chars):',
                                                  imageSrc.substring(0, 100)
                                                );
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        );
                                      })
                                      .filter(Boolean)}
                                  </div>
                                )}

                                <div className="idea-meta">
                                  <span>
                                    <i className="far fa-user"></i> Автор: {idea.author.firstName}{' '}
                                    {idea.author.lastName}
                                  </span>
                                  <span>
                                    <i className="far fa-calendar"></i> {formatDate(idea.createdAt)}
                                  </span>
                                </div>

                                {/* Admin actions - hidden for completed topics */}
                                {!isCompleted && (idea.canEdit || idea.canPin) && (
                                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {idea.canEdit && (
                                      <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => startAdminEditingIdea(idea)}
                                      >
                                        Редактировать
                                      </button>
                                    )}
                                    {idea.canPin &&
                                      (idea.isPinned ? (
                                        <button
                                          className="btn btn-outline btn-sm"
                                          onClick={() => handleAdminUnpinIdea(idea.id)}
                                        >
                                          Открепить
                                        </button>
                                      ) : (
                                        <button
                                          className="btn btn-outline btn-sm"
                                          onClick={() => handleAdminPinIdea(idea.id)}
                                        >
                                          Закрепить
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <CommentSection ideaId={idea.id} readOnly={isCompleted} />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

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
    }

    return (
      <div className="admin-section">
        <TopicsListView<Topic>
          topics={activeTopics}
          loading={topicsLoading}
          title="Активные темы обсуждения"
          onTopicClick={(topic) => {
            setSelectedTopicForFlow(topic);
            fetchFlowIdeas(topic.id);
          }}
          formatDeadline={formatDeadline}
          emptyText="Пока нет активных тем для обсуждения."
          loadingText="Загружаем темы..."
        />

        {completedTopics.length > 0 && (
          <TopicsListView<Topic>
            topics={completedTopics}
            loading={topicsLoading}
            title="Завершённые темы"
            onTopicClick={(topic) => {
              setSelectedTopicForFlow(topic);
              fetchFlowIdeas(topic.id);
            }}
            formatDeadline={formatDeadline}
            emptyText=""
            loadingText="Загружаем темы..."
          />
        )}
      </div>
    );
  };

  const renderIdeasTab = () => (
    <div className="admin-section">
  

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
                <th>Оценка</th>
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
                        {editingAdminIdeaId === idea.id ? (
                          <input
                            type="text"
                            value={adminEditTitle}
                            onChange={(e) => setAdminEditTitle(e.target.value)}
                            disabled={isUpdatingAdminIdea}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.6rem',
                              borderRadius: 'var(--border-radius-sm)',
                              border: '1px solid var(--border-color)',
                            }}
                          />
                        ) : (
                          <strong>{idea.title}</strong>
                        )}
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
                      <td>
                        <span className="idea-likes-cell">
                          <i className="fas fa-heart" style={{ color: '#c2410c', fontSize: '0.85rem' }}></i>
                          {idea.likes}
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
                      <td className="idea-actions-cell">
                        {editingAdminIdeaId === idea.id ? (
                          <div className="users-table__actions admin-action-row">
                            <button
                              className="cta-button primary"
                              onClick={() => handleAdminUpdateIdea(idea.id)}
                              disabled={isUpdatingAdminIdea || !adminEditTitle.trim()}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            >
                              {isUpdatingAdminIdea ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button
                              className="cta-button secondary"
                              onClick={cancelAdminEditingIdea}
                              disabled={isUpdatingAdminIdea}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <div className="users-table__actions admin-action-row">
                            <button
                              className="cta-button secondary"
                              onClick={() => startAdminEditingIdea(idea)}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            >
                              Редактировать
                            </button>
                            <button
                              className="cta-button danger"
                              onClick={() => handleDeleteIdea(idea)}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
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
      <header className="admin-header-bar">
        <div className="admin-header-inner container">
          <div className="logo-box" onClick={() => setActiveTab('ideaflow')}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)' }}></i>
            IdeaFlow Admin
          </div>

          <button
            type="button"
            className={`burger-btn ${adminMenuOpen ? 'open' : ''}`}
            aria-label="Меню"
            aria-expanded={adminMenuOpen}
            onClick={() => setAdminMenuOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`admin-nav ${adminMenuOpen ? 'open' : ''}`}>
            {getAdminTabs().map((tab) => (
              <a
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </a>
            ))}

            <a
              className={window.location.pathname === '/analysis' ? 'active' : ''}
              onClick={() => navigate('/analysis')}
            >
              Анализ
            </a>

            <div
              className="profile-pill admin-profile-pill"
              title="Администратор"
              onClick={() => setActiveTab('profile')}
              style={{ cursor: 'pointer' }}
            >
              <div className="avatar-sq">{getInitials()}</div>
              <div className="admin-profile-text">
                <strong>Администратор</strong>
              </div>
            </div>

            <button onClick={handleLogout} className="header-logout-btn admin-logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className={`container ${isAdmin ? 'admin-container' : ''}`}>
          {isAdmin ? (
            <>
              {activeTab === 'users' && (
                <UsersTab
                  users={users}
                  usersLoading={usersLoading}
                  onBlockClick={handleBlockClick}
                  onUnblockClick={handleUnblockClick}
                />
              )}
              {activeTab === 'support' && (
                <SupportTab
                  supportMessages={supportMessages}
                  supportLoading={supportLoading}
                  onMarkAsRead={handleMarkAsRead}
                />
              )}
              {activeTab === 'topics' && renderTopicsTab()}
              {activeTab === 'ideas' && renderIdeasTab()}
              {activeTab === 'ideaflow' && renderIdeaFlowTab()}
              {activeTab === 'profile' && renderAdminProfileTab()}
            </>
          ) : (
            <div className="card welcome-card">
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
            </div>
          )}
        </div>
      </main>
      
      <footer className="dashboard-footer">
        <div className="container">
          <p>© 2026 IdeaFlow Platform</p>
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