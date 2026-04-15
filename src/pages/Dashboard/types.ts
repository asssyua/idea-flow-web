export interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
  role?: string;
}

export interface AdminUser {
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

export interface SupportMessage {
  id: string;
  userEmail: string;
  userName: string;
  message: string;
  blockReason: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  status: string;
  privacy: string;
  deadline: string | null;
  ideaCount: number;
  commentCount?: number;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
  author?: {
    firstName: string;
    lastName: string;
  };
  createdAt?: string;
}

export interface Idea {
  id: string;
  title: string;
  images?: string[];
  likes: number;
  dislikes: number;
  rating: number;
  commentCount: number;
  isPinned?: boolean;
  canPin?: boolean;
  canEdit?: boolean;
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

export interface Comment {
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

export type AdminTab = 'users' | 'topics' | 'ideas' | 'support' | 'ideaflow' | 'profile';
