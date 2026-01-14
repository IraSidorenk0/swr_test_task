'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Post } from '../types';
import { useLikedPosts } from '../../store/actions/hooks';

import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface User {
  uid: string;
  name?: string;
  email?: string | null;
  image?: string | null;
}

interface PostsClientProps {
  posts: Post[];
  initialLikedPostIds: string[];
  initialUser: User | null;
}

export default function PostsClient({ 
  posts, 
  initialLikedPostIds,
  initialUser 
}: PostsClientProps) {
  // Initialize user state with the server-side user if available
  const [user, setUser] = useState(initialUser);
  const { likedPostIds, isLoading: likesLoading, error: likesError } = useLikedPosts(user?.uid);
  
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [submitMessage, setSubmitMessage] = useState('');

  // ... (rest of the component logic remains the same as in PostList.tsx)
  // You'll need to copy over all the handler functions (handlePostCreated, beginEditPost, etc.)
  // from the original PostList component

  if (likesLoading || posts === undefined) {
    return <LoadingSpinner message="Загрузка постов..." size="lg" />;
  }

  if (likesError) {
    return (
      <ErrorMessage
        message={`Не удалось загрузить посты: ${likesError.message}`}
        showTroubleshooting={true}
        onRetry={() => window.location.reload()}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  // ... (rest of the JSX remains the same)
  // Copy over the JSX from the original PostList component
  
  return (
    <div className="animate-fade-in">
      {/* Header, Filters, PostForm, AuthModal, Posts List, ConfirmDialog */}
      {/* Copy over the JSX from the original PostList component */}
    </div>
  );
}
