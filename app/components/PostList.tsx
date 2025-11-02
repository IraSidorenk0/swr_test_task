'use client';

import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Post, PostFormData } from '../types';
import PostForm from './PostForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPosts, updatePost, deletePost, toggleLike, fetchLikedStates, optimisticToggleLike, revertOptimisticLike } from '../../store/slices/postsSlice';
import AuthModal from './AuthModal';
import PostFilters from './PostFilters';
import PostCard from './PostCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';


export default function PostList() {
  const dispatch = useAppDispatch();
  const { posts, likedPostIds, loading, error } = useAppSelector((state) => state.posts);
  
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editData, setEditData] = useState<PostFormData>({ title: '', content: '', tags: [], likes: 0 });
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  // Filters
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');
  
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [submitMessage, setSubmitMessage] = useState('');


  // Fetch posts on component mount and when applied filters change
  useEffect(() => {
    dispatch(fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter }));
  }, [dispatch, appliedAuthorFilter, appliedTagFilter]);

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowAuthModal(false);
        setSubmitMessage('');
        // Refresh liked states when user logs in
        if (posts.length > 0) {
          dispatch(fetchLikedStates({ posts, userId: currentUser.uid }));
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, posts]);

  // Handle post creation success
  const handlePostCreated = () => {
    console.log('🎉 Post creation successful! Refreshing posts list...');
    setShowPostForm(false);
    // Posts will be automatically updated via Redux state
  };


  const beginEditPost = (post: Post) => {
    if (!user) return;
    if (post.authorId !== user.uid) return;
    setEditingPostId(post.id);
    setEditData({
      title: post.title,
      content: post.content,
      tags: Array.isArray(post.tags) ? post.tags : [],
      likes: typeof post.likes === 'number' ? post.likes : 0
    });
    setEditErrors({});
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditErrors({});
    setIsEditing(false);
  };

  const submitEditPost = async (postId: string) => {
    if (!user) return;
    setIsEditing(true);
    setEditErrors({});
    try {
      const cleanedTags = (editData.tags || []).map(t => (t ?? '').trim()).filter(t => t.length > 0);
      if (!editData.title || editData.title.trim().length < 5) {
        setEditErrors(prev => ({ ...prev, title: 'Минимум 5 символов' }));
        setIsEditing(false);
        return;
      }
      if (!editData.content || editData.content.trim().length < 10) {
        setEditErrors(prev => ({ ...prev, content: 'Минимум 10 символов' }));
        setIsEditing(false);
        return;
      }
      if (cleanedTags.length === 0) {
        setEditErrors(prev => ({ ...prev, tags: 'Добавьте хотя бы один тег' }));
        setIsEditing(false);
        return;
      }

      const updates = {
        title: editData.title.trim(),
        content: editData.content.trim(),
        tags: cleanedTags,
        likes: Math.max(0, Number(editData.likes || 0)),
      };

      await dispatch(updatePost({ postId, updates })).unwrap();
      setEditingPostId(null);
    } catch (e) {
      console.error('Error updating post:', e);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePost = (post: Post) => {
    if (!user) return;
    if (post.authorId !== user.uid) return;
    setPostToDelete(post);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await dispatch(deletePost(postToDelete.id)).unwrap();
      if (editingPostId === postToDelete.id) cancelEditPost();
    } catch (e) {
      console.error('Error deleting post:', e);
    } finally {
      setConfirmOpen(false);
      setPostToDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPostToDelete(null);
  };

  const handleToggleLike = async (post: Post) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    const userId = user.uid;
    const isLiked = likedPostIds.includes(post.id);
    const increment = isLiked ? -1 : 1;
    
    // Optimistic update
    dispatch(optimisticToggleLike({ postId: post.id, increment, isLiked: !isLiked }));
    
    try {
      await dispatch(toggleLike({ postId: post.id, userId, isLiked })).unwrap();
    } catch (e) {
      console.error('Error toggling like:', e);
      // Revert optimistic update on failure
      dispatch(revertOptimisticLike({ postId: post.id, increment, isLiked: !isLiked }));
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Дата неизвестна';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Handle regular Date
      return new Date(timestamp).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Дата неизвестна';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Загрузка постов..." size="lg" />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={`Не удалось загрузить посты: ${error}`}
        showTroubleshooting={true}
        onRetry={() => window.location.reload()}
        onRefresh={() => dispatch(fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter }))}
      />
    );
  }
  const loginToSite = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  }

  const registerToSite = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSubmitMessage('Вы вышли из системы');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-responsive-lg font-bold text-gray-900">Последние посты</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {user ? (
            <>
              <span className="text-gray-600 mr-2">
                Привет, {user.displayName || user.email}!
              </span>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="btn btn-primary w-full sm:w-auto"
              >
                {showPostForm ? '📝 Скрыть форму' : '✍️ Создать пост'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loginToSite}
                className="btn btn-primary w-full sm:w-auto"
              >
                🔐 Войти
              </button>
              <button
                onClick={registerToSite}
                className="btn btn-success w-full sm:w-auto"
              >
                📝 Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <PostFilters
        authorFilter={authorFilter}
        tagFilter={tagFilter}
        appliedAuthorFilter={appliedAuthorFilter}
        appliedTagFilter={appliedTagFilter}
        onAuthorFilterChange={setAuthorFilter}
        onTagFilterChange={setTagFilter}
        onApplyFilters={() => {
          setAppliedAuthorFilter(authorFilter.trim());
          setAppliedTagFilter(tagFilter.trim());
        }}
        onResetFilters={() => {
          setAuthorFilter('');
          setTagFilter('');
          setAppliedAuthorFilter('');
          setAppliedTagFilter('');
        }}
      />

      {/* Post Form */}
      {showPostForm && (
        <div className="mb-8">
          <PostForm onSuccess={handlePostCreated} />
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isVisible={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Posts List */}
      <div className="space-y-8">
        {!posts || posts.length === 0 ? (
          <EmptyState
            title="Пока нет постов"
            description="Создайте первый пост, чтобы начать!"
            actionLabel={user ? "✍️ Создать первый пост" : undefined}
            onAction={user ? () => setShowPostForm(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                likedPostIds={likedPostIds}
                editingPostId={editingPostId}
                editData={editData}
                editErrors={editErrors}
                isEditing={isEditing}
                onToggleLike={handleToggleLike}
                onBeginEdit={beginEditPost}
                onCancelEdit={cancelEditPost}
                onSubmitEdit={submitEditPost}
                onDelete={handleDeletePost}
                onEditDataChange={(data) => setEditData(prev => ({ ...prev, ...data }))}
                onAuthorFilter={(authorName) => {
                  setAuthorFilter(authorName);
                  setAppliedAuthorFilter(authorName);
                }}
                onTagFilter={(tag) => {
                  setTagFilter(tag);
                  setAppliedTagFilter(tag);
                }}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Удалить этот пост?"
        description="Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}