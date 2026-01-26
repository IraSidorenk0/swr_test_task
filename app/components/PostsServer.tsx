import { Post } from '../types';
import PostCard from './PostCard';
import EmptyState from './EmptyState';
import { User } from 'firebase/auth';

interface PostsServerProps {
  posts: Post[];
  onEditPost: (post: Post) => void;
  onDeleteClick: (post: Post) => void;
  onLikeClick: (post: Post) => void; // Updated to accept Post instead of postId
  likedPostIds: string[];
  isAuthenticated: boolean;
  currentUser: User | null;
  editingPostId: string | null;
  editData: { title: string; content: string; tags: string[] };
  editErrors: Record<string, string | undefined>;
  isEditing: boolean;
  onBeginEdit: (post: Post) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (post: Post) => void;
  onEditDataChange: (data: { title?: string; content?: string; tags?: string[] }) => void;
  onAuthorFilter: (authorName: string) => void;
  onTagFilter: (tag: string) => void;
  formatDate: (date: Date | unknown ) => string;
}

export default function PostsServer({
  posts,
  onEditPost,
  onDeleteClick,
  onLikeClick,
  likedPostIds,
  isAuthenticated,
  currentUser,
  editingPostId,
  editData,
  editErrors,
  isEditing,
  onBeginEdit,
  onCancelEdit,
  onSubmitEdit,
  onEditDataChange,
  onAuthorFilter,
  onTagFilter,
  formatDate,
}: PostsServerProps) {
  if (posts.length === 0) {
    return <EmptyState title="Пока нет постов" description="Создайте первый пост, чтобы начать!" />;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          editingPostId={editingPostId}
          editData={editData}
          editErrors={editErrors}
          isEditing={isEditing}
          onToggleLike={onLikeClick}
          onCancelEdit={onCancelEdit}
          onSubmitEdit={onSubmitEdit}
          onDelete={onDeleteClick}
          onEditDataChange={onEditDataChange}
          formatDate={formatDate}
          isLiked={likedPostIds.includes(post.id)}
          isOwnPost={isAuthenticated && post.authorId === currentUser?.uid}
        />
      ))}
    </div>
  );
}
