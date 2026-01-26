'use client';

import { useState } from 'react';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '../../firebase/firebase-admin';
import { signOut } from '../../firebase/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

interface NavigationProps {
  currentUser: User | null;
  commentsCount?: number;
}

export default function Navigation({ currentUser, commentsCount = 0 }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Initialize Firebase Admin if not already initialized
      initializeFirebaseAdmin();
      
      if (currentUser?.uid) {
        // Revoke refresh tokens for the user (server-side sign out)
        await getAuth().revokeRefreshTokens(currentUser.uid);
      }
      
      // Clear server-side session
      const result = await signOut();
      
      if (result.success) {
        setIsMenuOpen(false);
        // Refresh the page to update the UI
        router.refresh();
      } else {
        console.error('Failed to sign out from server');
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                BB
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Best Blog</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </Link>
            
            {currentUser ? (
              <>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {currentUser.photoURL ? (
                      <Image 
                        className="h-8 w-8 rounded-full" 
                        src={currentUser.photoURL} 
                        alt="User avatar"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="block text-sm text-gray-700">
                        {currentUser.email}
                      </span>
                      {commentsCount > 0 && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span className="mr-1">❤️</span>
                          {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/auth" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/auth" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Registration
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors"
              aria-label="Открыть меню"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              <Link 
                href="/" 
                className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center px-3 py-2">
                    {currentUser.photoURL ? (
                      <Image
                        className="h-8 w-8 rounded-full" 
                        src={currentUser.photoURL} 
                        alt="User avatar"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                        {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">
                        {currentUser.email}
                      </span>
                      {commentsCount > 0 && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span className="mr-1">❤️</span>
                          {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link 
                    href="/auth" 
                    className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth" 
                    className="block bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors mx-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Registration
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
