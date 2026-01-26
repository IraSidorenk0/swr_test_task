'use client';

import Link from 'next/link';
import { Post } from '../types';
import { useRouter } from 'next/navigation';

interface PostFormData {
  title: string;
  content: string;
  tags: string[];
  likes?: number;
  likedBy?: string[];
}

interface PostCardProps {
  post: Post;
  editingPostId: string | null;
  editData: PostFormData;
  editErrors: Record<string, string | undefined>;
  isEditing: boolean;
  onToggleLike: (post: Post) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onEditDataChange: (data: Partial<PostFormData>) => void;
  formatDate: (date: Date) => string;
  isLiked: boolean;
  isOwnPost: boolean;
}

export default function PostCard({
  post,
  editingPostId,
  editData,
  editErrors,
  isEditing,
  onToggleLike,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onEditDataChange,
  formatDate,
  isLiked,
  isOwnPost,
}: PostCardProps) {
  const router = useRouter();
  const isEditingThisPost = isEditing && editingPostId === post.id;

  return (
    <article className="card card-hover p-6 animate-fade-in group">
      <header className="mb-4">
        {isEditingThisPost ? (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Edit Post</h3>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => onEditDataChange({ title: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Title"
            />
            {editErrors.title && (
              <p className="text-red-500 text-sm mb-2">{editErrors.title}</p>
            )}
            <textarea
              value={editData.content}
              onChange={(e) => onEditDataChange({ content: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              placeholder="Content"
              rows={4}
            />
            {editErrors.content && (
              <p className="text-red-500 text-sm mb-2">{editErrors.content}</p>
            )}
            <div className="flex gap-2 mb-4">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => onSubmitEdit(post)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
              <Link href={`/posts/${post.id}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span>By {post.authorName}</span>
              <span className="mx-2">•</span>
              <time dateTime={typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString()}>
                {formatDate(typeof post.createdAt === 'string' ? new Date(post.createdAt) : post.createdAt)}
              </time>
            </div>
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/posts/${post.id}`}
                    className="inline-block text-sm text-blue-600 hover:underline"
                  >
                    Read more →
                  </Link>
                ))}
              </div>
            )}
            
            <p className="text-gray-700 mb-4">{post.content}</p>
            
            <div className="flex items-center justify-between">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onToggleLike(post);
                }}
                className={`flex items-center gap-1 text-sm ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
              >
                <span>❤️</span>
                <span>{post.likes || 0} likes</span>
              </button>
              
              {isOwnPost && (
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/auth?redirect=${encodeURIComponent(`/posts/${post.id}/edit`)}`);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(post);
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {!isEditingThisPost && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={`/posts/${post.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
            >
              Read more
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </header>
    </article>
  );
}
