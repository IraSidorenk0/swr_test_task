'use client';

import Link from 'next/link';
import { Post, PostFormData } from '../types';

interface PostCardProps {
  post: Post;
  user: any;
  likedPostIds: string[];
  editingPostId: string | null;
  editData: PostFormData;
  editErrors: Record<string, string | undefined>;
  isEditing: boolean;
  onToggleLike: (post: Post) => void;
  onBeginEdit: (post: Post) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (postId: string) => void;
  onDelete: (post: Post) => void;
  onEditDataChange: (data: Partial<PostFormData>) => void;
  onAuthorFilter: (authorName: string) => void;
  onTagFilter: (tag: string) => void;
  formatDate: (timestamp: any) => string;
}

export default function PostCard({
  post,
  user,
  likedPostIds,
  editingPostId,
  editData,
  editErrors,
  isEditing,
  onToggleLike,
  onBeginEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onEditDataChange,
  onAuthorFilter,
  onTagFilter,
  formatDate,
}: PostCardProps) {
  const isOwner = user && user.uid === post.authorId;
  const isInEditMode = editingPostId === post.id;

  return (
    <article className="card card-hover p-6 animate-fade-in group">
      {/* Post Header */}
      <header className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
          <Link href={`/posts/${post.id}`} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => onAuthorFilter(post.authorName || '')}
            className="flex items-center hover:text-blue-600 transition-colors"
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
              {post.authorName.charAt(0).toUpperCase()}
            </div>
            {post.authorName}
          </button>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {formatDate(post.createdAt)}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {post.likes}
          </span>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLike(post)}
            className={`btn text-xs px-3 py-1 rounded-full transition-all ${
              likedPostIds.includes(post.id) 
                ? 'bg-pink-600 text-white hover:bg-pink-700' 
                : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
            }`}
          >
            {likedPostIds.includes(post.id) ? '💗 Лайкнуто' : '❤️ Лайк'}
          </button>
        </div>
        
        {isOwner && (
          <div className="flex gap-2">
            {isInEditMode ? (
              <>
                <button
                  onClick={() => onSubmitEdit(post.id)}
                  disabled={isEditing}
                  className="btn btn-success text-xs"
                >
                  💾 Сохранить
                </button>
                <button
                  onClick={onCancelEdit}
                  className="btn btn-secondary text-xs"
                >
                  ❌ Отмена
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onBeginEdit(post)}
                  className="btn btn-warning text-xs"
                >
                  ✏️ Изменить
                </button>
                <button
                  onClick={() => onDelete(post)}
                  className="btn btn-danger text-xs"
                >
                  🗑️ Удалить
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Post Content or Edit Form */}
      {isInEditMode ? (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
            <input
              value={editData.title}
              onChange={(e) => onEditDataChange({ title: e.target.value })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите заголовок"
            />
            {editErrors.title && (
              <p className="mt-1 text-sm text-red-600">{editErrors.title}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст *</label>
            <textarea
              value={editData.content}
              onChange={(e) => onEditDataChange({ content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите текст поста"
            />
            {editErrors.content && (
              <p className="mt-1 text-sm text-red-600">{editErrors.content}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Теги (через запятую) *</label>
            <input
              value={(editData.tags || []).join(', ')}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                onEditDataChange({ tags });
              }}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tag1, tag2"
            />
            {editErrors.tags && (
              <p className="mt-1 text-sm text-red-600">{editErrors.tags}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Лайки</label>
            <input
              value={editData.likes}
              onChange={(e) => {
                const num = Number(e.target.value);
                onEditDataChange({ 
                  likes: Number.isFinite(num) && num >= 0 ? num : 0 
                });
              }}
              type="number"
              min="0"
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="prose max-w-none max-h-32 overflow-hidden relative">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {post.content}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white"></div>
          </div>
        </div>
      )}

      {/* Tags and Actions */}
      <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag, index) => (
              <button
                type="button"
                key={index}
                onClick={() => onTagFilter(tag)}
                className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-blue-200 transition-colors"
              >
                #{tag}
              </button>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{post.tags.length - 3} еще
              </span>
            )}
          </div>
        )}

        <Link
          href={`/posts/${post.id}`}
          className="btn btn-primary text-xs sm:text-sm flex items-center justify-center gap-2 hover:gap-3 transition-all"
        >
          Читать далее
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </footer>
    </article>
  );
}
