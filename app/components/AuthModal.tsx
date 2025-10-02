'use client';

import { useState } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

interface AuthModalProps {
  isVisible: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ isVisible, initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  if (!isVisible) return null;

  const handleSuccess = () => {
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 text-xl font-bold shadow-lg z-10"
          aria-label="Закрыть"
        >
          ×
        </button>
        
        <div className="animate-fade-in">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setMode('register')}
            />
          ) : (
            <RegistrationForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
