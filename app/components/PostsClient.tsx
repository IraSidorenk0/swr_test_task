'use client';

import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Post, PostFormData } from '../types';
import PostForm from './PostForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPosts, updatePost, deletePost, toggleLike, fetchLikedStates, optimisticToggleLike, revertOptimisticLike } from '../../store/slices/postsSlice';

import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface User {
  uid: string;
  name?: string;
  email?: string | null;
  image?: string | null;
}

interface PostsClientProps {
  initialPosts: Post[];
  initialLikedPostIds: string[];
  initialUser: User | null;
}

export default function PostsClient({ 
  initialPosts = [], 
  initialLikedPostIds = [],
  initialUser = null 
}: PostsClientProps) {
  // const dispatch = useAppDispatch();
  const { posts: reduxPosts, likedPostIds: reduxLikedPostIds, loading, error } = useAppSelector((state) => ({
    posts: state.posts.posts,
    likedPostIds: state.posts.likedPostIds,
    loading: state.posts.loading,
    error: state.posts.error
  }));
  
  // Use initial posts from props if Redux store is empty, otherwise use Redux state
  const posts = (reduxPosts && reduxPosts.length > 0) ? reduxPosts : initialPosts;
  const likedPostIds = (reduxLikedPostIds && reduxLikedPostIds.length > 0) ? reduxLikedPostIds : initialLikedPostIds;
  
 // Initialize user state with the server-side user if available
  const [user, setUser] = useState(initialUser);
  
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [submitMessage, setSubmitMessage] = useState('');

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter });
  }, [appliedAuthorFilter, appliedTagFilter]);

  // Authentication state listener
  useEffect(() => {
    // Only set up the auth listener if we don't already have a user from the server
    if (!user) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setShowAuthModal(false);
          setSubmitMessage('');
          // Only fetch liked states if we have posts
          if (posts?.length) {
            fetchLikedStates({ 
              posts, 
              userId: currentUser.uid 
            });
          }
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [ posts, user]);

  // ... (rest of the component logic remains the same as in PostList.tsx)
  // You'll need to copy over all the handler functions (handlePostCreated, beginEditPost, etc.)
  // from the original PostList component

  if (loading || posts === undefined) {
    return <LoadingSpinner message="Загрузка постов..." size="lg" />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={`Не удалось загрузить посты: ${error}`}
        showTroubleshooting={true}
        onRetry={() => window.location.reload()}
        onRefresh={() => fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter })}
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
