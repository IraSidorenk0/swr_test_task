'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'min-h-32',
    md: 'min-h-64',
    lg: 'min-h-screen'
  };

  return (
    <div className={`flex justify-center items-center ${sizeClasses[size]}`}>
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <div className="text-lg text-gray-600">{message}</div>
      </div>
    </div>
  );
}
