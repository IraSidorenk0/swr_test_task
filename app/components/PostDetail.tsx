'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Post } from '../types';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

interface PostDetailProps {
  postId: string;
}

export default function PostDetail({ postId }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  // Fetch post on component mount and when postId changes
  useEffect(() => {
    if (postId) {
      fetchPost();
    }
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
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку постов
        </button>
      </div>

      {/* Post Content */}
      <article className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-8">
        {/* Post Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>
          <div className="flex items-center text-sm text-gray-500 space-x-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-2">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <span>{post.authorName}</span>
            </div>
            <span>📅 {formatDate(post.createdAt)}</span>
            <span>❤️ {post.likes}</span>
          </div>
        </header>

        {/* Post Content */}
        <div className="prose max-w-none mb-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
            {post.content}
          </p>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Comments Section */}
      <div className="space-y-6">
        {/* Comment Form */}
        <CommentForm postId={postId} onSuccess={handleCommentCreated} />
        
        {/* Comment List */}
        <CommentList postId={postId} />
      </div>
    </div>
  );
}