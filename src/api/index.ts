import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Если ошибка 401 и это не запрос обновления токена
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Удаляем токен и перенаправляем на главную
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Если это не главная страница, делаем редирект
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    
    // Обработка сетевых ошибок
    if (!error.response) {
      console.error('Network error:', error);
      return Promise.reject(new Error('Network error. Please check your internet connection.'));
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyEmail: (data: any) => api.post('/auth/verify-email', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  getBlockInfo: () => api.get('/profile/block-info'),
  getAdminProfile: () => api.get('/profile/admin'),
};

// Admin API
export const adminAPI = {
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  blockUser: (id: string, data: any) => api.patch(`/admin/users/${id}/block`, data),
  unblockUser: (id: string) => api.patch(`/admin/users/${id}/unblock`),
  getAllSupportMessages: () => api.get('/admin/support-messages'),
  markSupportMessageAsRead: (id: string) => api.patch(`/admin/support-messages/${id}/read`),
  sendSupportMessage: (data: any) => api.post('/admin/support-message', data),
};

// Topic API
export const topicAPI = {
  getAllTopics: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get(`/topics${params}`);
  },
  getPublicTopics: () => api.get('/topics/public'),
  getTopicById: (id: string) => api.get(`/topics/${id}`),
  createTopic: (data: any) => api.post('/topics', data),
  suggestTopic: (data: any) => api.post('/topics/suggest', data),
  updateTopic: (id: string, data: any) => api.patch(`/topics/admin/${id}`, data),
  deleteTopic: (id: string) => api.delete(`/topics/${id}`),
  approveTopic: (id: string) => api.patch(`/topics/${id}/approve`),
  rejectTopic: (id: string) => api.patch(`/topics/${id}/reject`),
  getPendingTopics: () => api.get('/topics/admin/pending'),
};

// Idea API
export const ideaAPI = {
  getIdeasByTopic: (topicId: string) => api.get(`/ideas?topicId=${topicId}`),
  createIdea: (data: any) => api.post('/ideas', data),
  likeIdea: (ideaId: string) => api.post(`/ideas/${ideaId}/like`),
  dislikeIdea: (ideaId: string) => api.post(`/ideas/${ideaId}/dislike`),
  getIdeaById: (ideaId: string) => api.get(`/ideas/${ideaId}`),
  getComments: (ideaId: string) => api.get(`/ideas/${ideaId}/comments`),
  addComment: (ideaId: string, data: { content: string; parentId?: string }) => api.post(`/ideas/${ideaId}/comments`, data),
  deleteComment: (commentId: string) => api.delete(`/ideas/comments/${commentId}`),
};

export default api;