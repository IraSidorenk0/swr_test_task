'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, increment, getDoc as getDocOnce, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase';
import { Post } from '../types';
import InlineNotice from './InlineNotice';
import Link from 'next/link';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

interface PostDetailProps {
  postId: string;
}

export default function PostDetail({ postId }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showLoginNotice, setShowLoginNotice] = useState(false);

  // Fetch post function
  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const postDoc = await getDoc(doc(db, 'posts', postId));
      
      if (postDoc.exists()) {
        setPost({
          id: postDoc.id,
          ...postDoc.data()
        } as Post);
      } else {
        setError(new Error('Пост не найден'));
      }
    } catch (error: any) {
      console.error('Error fetching post:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    const user = auth.currentUser;
    if (!user) {
      setShowLoginNotice(true);
      return;
    }
    if (!post) return;
    try {
      setLiking(true);
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      if (liked) {
        // Unlike
        setPost(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) - 1) } as Post : prev);
        setLiked(false);
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(-1) });
      } else {
        // Like
        setPost(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) + 1) } as Post : prev);
        setLiked(true);
        await setDoc(likeRef, { userId: user.uid, createdAt: new Date().toISOString() });
        await updateDoc(doc(db, 'posts', post.id), { likes: increment(1) });
      }
    } catch (e) {
      console.error('Error liking post:', e);
      // Revert on failure
      setPost(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) + (liked ? 1 : -1)) } as Post : prev);
      setLiked(prev => !prev);
    } finally {
      setLiking(false);
    }
  };

  // Fetch post on component mount and when postId changes
  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Fetch liked state when post or auth changes
  useEffect(() => {
    const sub = auth.onAuthStateChanged(async (current) => {
      if (postId && current) {
        try {
          const likeDoc = await getDocOnce(doc(db, 'posts', postId, 'likes', current.uid));
          setLiked(likeDoc.exists());
        } catch {
          setLiked(false);
        }
      } else {
        setLiked(false);
      }
    });
    return () => sub();
  }, [postId]);

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

  // Handle comment creation success
  const handleCommentCreated = () => {
    // This will be passed to CommentList to refresh comments
    // The CommentList component will handle its own refresh
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Загрузка поста...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Ошибка загрузки поста</h2>
          <p className="mb-4">{error.message}</p>
          <button
            onClick={fetchPost}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Пост не найден</h2>
          <p className="text-gray-600">Запрашиваемый пост не существует</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8 animate-fade-in">
      {/* Back Button */}
      <div className="mb-8">
        <button
          onClick={() => window.history.back()}
          className="btn btn-outline flex items-center gap-2 hover:gap-3 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку
        </button>
      </div>

      {/* Post Content */}
      <article className="card p-8 mb-12 animate-slide-in">
        {/* Post Header */}
        <header className="mb-8">
          <h1 className="text-responsive-xl font-bold text-gray-900 mb-6 leading-tight">{post.title}</h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{post.authorName}</p>
                  <p className="text-xs text-gray-500">Автор</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span>{post.likes} лайков</span>
              </div>
            </div>
            
            <button
              onClick={handleLike}
              disabled={liking}
              className={`btn text-sm px-6 py-2 rounded-full transition-all disabled:opacity-50 ${liked ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}
            >
              {liking ? (
                <div className="flex items-center gap-2">
                  <div className="loading-spinner"></div>
                  Обработка...
                </div>
              ) : liked ? '💗 Лайкнуто' : '❤️ Поставить лайк'}
            </button>
          </div>
        </header>

        {/* Post Content */}
        <div className="prose prose-lg max-w-none mb-8">
          {showLoginNotice && (
            <div className="mb-4">
              <InlineNotice
                tone="info"
                message="Войдите в аккаунт, чтобы поставить лайк."
                actionLabel="Войти"
                onAction={() => {
                  window.location.href = '/auth';
                }}
              />
            </div>
          )}
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-responsive-base">
            {post.content}
          </div>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              🏷️ Теги
            </h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full border border-blue-200 hover:shadow-sm transition-shadow"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Comments Section */}
      <div className="space-y-8">
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-responsive-lg font-bold text-gray-900 mb-6 flex items-center">
            💬 Обсуждение
          </h2>
          
          {/* Comment Form */}
          <div className="mb-8">
            <CommentForm postId={postId} onSuccess={handleCommentCreated} />
          </div>
          
          {/* Comment List */}
          <CommentList postId={postId} />
        </div>
      </div>
    </div>
  );
}