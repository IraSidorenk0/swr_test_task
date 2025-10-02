'use client';

type InlineNoticeProps = {
  tone?: 'info' | 'warning' | 'success' | 'error';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const toneClasses: Record<string, string> = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
};

export default function InlineNotice({
  tone = 'info',
  message,
  actionLabel,
  onAction,
  className = '',
}: InlineNoticeProps) {
  const classes = toneClasses[tone] || toneClasses.info;
  return (
    <div className={`border rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${classes} ${className}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden>ℹ️</span>
        <span className="text-sm">{message}</span>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary btn-sm whitespace-nowrap">
          {actionLabel}
        </button>
      )}
    </div>
  );
}


