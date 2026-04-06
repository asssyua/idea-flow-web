import React from 'react';
import './BadgeList.css';

export interface BadgeItem {
  type: string;
  level: number;
  title: string;
  description: string;
  tierLabel: string;
  color: string;
  firstEarnedAt: string;
}

interface BadgeListProps {
  badges: BadgeItem[];
  emptyMessage?: string;
  compact?: boolean;
}

const BadgeList: React.FC<BadgeListProps> = ({
  badges,
  emptyMessage = 'Пока нет достижений. Публикуйте идеи, комментируйте и набирайте лайки!',
  compact = false,
}) => {
  if (!badges.length) {
    return <p className={`badges-empty ${compact ? 'badges-empty--compact' : ''}`}>{emptyMessage}</p>;
  }

  return (
    <ul className={`badges-list ${compact ? 'badges-list--compact' : ''}`}>
      {badges.map((b) => (
        <li
          key={b.type}
          className="badge-item"
          style={{ borderLeftColor: b.color }}
        >
          <div className="badge-item-header">
            <span className="badge-item-title">{b.title}</span>
            <span className="badge-item-tier" style={{ color: b.color }}>
              {b.tierLabel}
            </span>
          </div>
          <p className="badge-item-desc">{b.description}</p>
        </li>
      ))}
    </ul>
  );
};

export default BadgeList;
