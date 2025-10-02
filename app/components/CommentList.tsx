'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchComments } from '../../store/slices/commentsSlice';
import type { Comment } from '../types';

interface CommentListProps {
  postId: string;
}

export default function CommentList({ postId }: CommentListProps) {
  const dispatch = useAppDispatch();
  const { commentsByPost, loading, error } = useAppSelector((state) => state.comments);
  const comments = commentsByPost[postId] || [];


  // Fetch comments on component mount and when postId changes
  useEffect(() => {
    if (postId) {
      dispatch(fetchComments(postId));
    }
  }, [dispatch, postId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Дата неизвестна';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Handle regular Date
      return new Date(timestamp).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Дата неизвестна';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Загрузка комментариев...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 text-center">
          <h3 className="font-semibold mb-2">Ошибка загрузки комментариев</h3>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={() => dispatch(fetchComments(postId))}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Комментарии ({comments.length})
        </h3>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Пока нет комментариев</p>
          <p className="text-sm text-gray-400 mt-1">Будьте первым, кто оставит комментарий!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{comment.authorName}</p>
                    <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="ml-10">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}