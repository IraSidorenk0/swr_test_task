'use client';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ 
  title, 
  description, 
  icon = '📝',
  actionLabel,
  onAction 
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-responsive-lg text-gray-600 mb-2">{title}</h2>
      <p className="text-gray-500 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
