import React from 'react';
import './TopicsListView.css';

export interface TopicsListItem {
  id: string;
  title: string;
  description: string;
  status?: string;
  privacy?: string;
  deadline: string | null;
  ideaCount: number;
  commentCount?: number;
  createdAt?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
  author?: {
    firstName: string;
    lastName: string;
  };
}

// Helper functions for Russian pluralization
const pluralizeIdeas = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${count} идей`;
  }

  if (lastDigit === 1) {
    return `${count} идея`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} идеи`;
  }

  return `${count} идей`;
};

const pluralizeComments = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${count} комментариев`;
  }

  if (lastDigit === 1) {
    return `${count} комментарий`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} комментария`;
  }

  return `${count} комментариев`;
};

interface TopicsListViewProps<T extends TopicsListItem> {
  topics: T[];
  loading: boolean;
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  onTopicClick: (topic: T) => void;
  renderTopicAction?: (topic: T) => React.ReactNode;
  formatDeadline: (deadline: string | null) => string | null;
  emptyText: string;
  footerHint?: React.ReactNode;
  loadingText?: string;
}

const TopicsListView = <T extends TopicsListItem>({
  topics,
  loading,
  title,
  actionLabel,
  onActionClick,
  onTopicClick,
  renderTopicAction,
  formatDeadline,
  emptyText,
  footerHint,
  loadingText = 'Загрузка тем для обсуждения...',
}: TopicsListViewProps<T>) => {
  const isTopicCompleted = (topic: T): boolean => {
    if (!topic.deadline) return false;
    const deadlineDate = new Date(topic.deadline);
    const now = new Date();
    return deadlineDate < now;
  };

  return (
    <div className="topics-section-full shared-topics-view">
      <div className="card topics-header-card">
        <div className="card-title topics-main-card-title">
          <h2>{title}</h2>
          {actionLabel && onActionClick && (
            <button className="btn btn-primary" onClick={onActionClick}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container shared-topics-loading">
          <div className="loading-spinner"></div>
          <p>{loadingText}</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="empty-state">
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="topics-grid">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`card topic-card ${isTopicCompleted(topic) ? 'topic-card--completed' : ''}`}
              onClick={() => onTopicClick(topic)}
            >
              <div className="flex-between topic-card-header-row">
                <h3>{topic.title || 'Без названия'}</h3>
                {renderTopicAction ? renderTopicAction(topic) : null}
              </div>
              <p>{topic.description || 'Нет описания'}</p>
              <div className="topic-meta">
                <span>
                  <i className="far fa-lightbulb"></i>
                  {pluralizeIdeas(topic.ideaCount || 0)}
                </span>
                {topic.commentCount !== undefined && topic.commentCount > 0 && (
                  <span>
                    <i className="far fa-comment"></i>
                    {pluralizeComments(topic.commentCount)}
                  </span>
                )}
                {topic.deadline && (
                  <span>
                    <i className="far fa-calendar"></i>
                    {isTopicCompleted(topic) ? 'Завершена' : 'До'} {formatDeadline(topic.deadline)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {footerHint ? (
        <div className="shared-topics-footer-hint">{footerHint}</div>
      ) : null}
    </div>
  );
};

export default TopicsListView;
