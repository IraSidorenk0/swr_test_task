'use client';

import { useState } from 'react';
import { useRouter, redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';
import { User } from '../types';

export default function AuthPageComponent({ currentUser }: { currentUser: User | null }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  if (currentUser) {
    const redirectTo = "/"; 
    redirect(redirectTo);
  }

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center card p-8 animate-fade-in">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h2>
          <p className="text-gray-600 mb-6">Please wait while we take you to your destination</p>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.refresh(); // Refresh to get the latest auth state
    router.push('/');
  };

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">
            BB
          </div>
          <h2 className="text-responsive-lg font-bold text-gray-900 mb-2">
            {isLogin ? '👋 Welcome back!' : '🎉 Join us!'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isLogin ? 'Login to continue' : 'Create an account in a few seconds'}
            </p>
          </div>
        
        <div className="card p-8">
          {isLogin ? (
            <LoginForm 
              onSuccess={handleSuccess}
              onSwitchToRegister={switchToRegister}
            />
          ) : (
            <RegistrationForm 
              onSuccess={handleSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}

