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

interface TopicsListViewProps<T extends TopicsListItem> {
  topics: T[];
  loading: boolean;
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  onTopicClick: (topic: T) => void;
  renderTopicAction?: (topic: T) => React.ReactNode;
  getTopicTagLabel: (topic: T) => string;
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
  getTopicTagLabel,
  formatDeadline,
  emptyText,
  footerHint,
  loadingText = 'Загрузка тем для обсуждения...',
}: TopicsListViewProps<T>) => {
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
              className="card topic-card"
              onClick={() => onTopicClick(topic)}
            >
              <div className="flex-between topic-card-header-row">
                <h3>{topic.title || 'Без названия'}</h3>
                {renderTopicAction ? renderTopicAction(topic) : null}
              </div>
              <p>{topic.description || 'Нет описания'}</p>
              <div className="tag">{getTopicTagLabel(topic)}</div>
              <div className="topic-meta">
                <span>
                  <i className="far fa-lightbulb"></i>
                  {topic.ideaCount || 0} идей
                </span>
                <span>
                  <i className="far fa-calendar"></i>
                  {topic.deadline ? `До ${formatDeadline(topic.deadline)}` : 'Без срока'}
                </span>
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
