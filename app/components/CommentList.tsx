'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchComments } from '../../store/slices/commentsSlice';

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          💬 Комментарии 
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {comments.length}
          </span>
        </h3>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-12 card animate-slide-in">
          <div className="text-5xl mb-4">🤷‍♂️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Пока нет комментариев</h3>
          <p className="text-sm text-gray-500">Будьте первым, кто оставит комментарий!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment, index) => (
            <div key={comment.id} className="card p-6 animate-slide-in hover:shadow-lg transition-all" style={{ animationDelay: `${index * 0.1}s` }}>
              {/* Comment Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {comment.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {comment.authorName}
                    </h4>
                    <time className="text-xs text-gray-500 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {formatDate(comment.createdAt)}
                    </time>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="ml-14">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}