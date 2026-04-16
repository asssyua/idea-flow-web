export interface AchievementMetrics {
  ideasCount: number;
  commentsCount: number;
  topicsCount: number;
  likesReceived: number;
  likesGiven: number;
  pinnedIdeasCount: number;
  commentedTopicsCount: number;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  iconClass: string;
  unlocked: boolean;
}

export const getProfileAchievements = (
  metrics: AchievementMetrics,
): AchievementDefinition[] => {
  return [
    {
      key: 'first-author',
      title: 'Первый автор',
      description: 'Опубликовать первую идею (1 идея)',
      iconClass: 'fas fa-pen-nib',
      unlocked: metrics.ideasCount >= 1,
    },
    {
      key: 'comment-guru',
      title: 'Гуру комм.',
      description: 'Написать 50+ комментариев',
      iconClass: 'fas fa-comments',
      unlocked: metrics.commentsCount >= 50,
    },
    {
      key: 'topic-master',
      title: 'Мастер тем',
      description: 'Создать 5+ тем',
      iconClass: 'fas fa-crown',
      unlocked: metrics.topicsCount >= 5,
    },
    {
      key: 'editors-choice',
      title: 'Выбор редакции',
      description: '3 идеи были закреплены',
      iconClass: 'fas fa-thumbtack',
      unlocked: metrics.pinnedIdeasCount >= 3,
    },
    {
      key: 'idea-generator',
      title: 'Генератор идей',
      description: 'Опубликовано 10 идей',
      iconClass: 'fas fa-lightbulb',
      unlocked: metrics.ideasCount >= 10,
    },
    {
      key: 'community-heart',
      title: 'Сердце сообщества',
      description: 'Поставлено 10 лайков чужим идеям',
      iconClass: 'fas fa-heart',
      unlocked: metrics.likesGiven >= 10,
    },
    {
      key: 'inspirer',
      title: 'Вдохновитель',
      description: 'Собрано 15 лайков на свои идеи (суммарно)',
      iconClass: 'fas fa-star',
      unlocked: metrics.likesReceived >= 15,
    },
    {
      key: 'know-it-all',
      title: 'Всезнайка',
      description: 'Оставил комментарии не менее чем в 5 разных темах',
      iconClass: 'fas fa-brain',
      unlocked: metrics.commentedTopicsCount >= 5,
    },
  ];
};
