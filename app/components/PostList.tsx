'use client';

import { useState, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import ConfirmDialog from './ConfirmDialog';
import { AppUser, Post, PostFormData } from '../types';
import PostForm from './PostForm';
import PostCard from './PostCard';
import { PostFilters } from './PostFilters';
import { usePosts } from '../../hooks/usePosts';
import { useLikedPosts } from '../../hooks/useLikedPosts';

export default function PostList({ currentUser, posts}: { 
  currentUser: AppUser | null,
  posts: Post[]
}) {
  // Filters
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  // Use the usePosts hook for posts CRUD
  const { 
    createPost,
    updatePost,
    deletePost,
  } = usePosts({ 
    author: authorFilter, 
    tag: tagFilter 
  });

  // Use the useLikedPosts hook for tracking liked posts and toggling like state
  const { likedPostIds, toggleLike: toggleLikeLocal } = useLikedPosts(currentUser?.uid);

  const [showPostForm, setShowPostForm] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    tags: [],
    likes: 0
  });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Omit<Post, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>>({ 
    title: '', 
    content: '', 
    tags: [], 
    likes: 0 
  });
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');

  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);

  const filteredPosts = useMemo(() => {
    const authorTerm = appliedAuthorFilter.trim().toLowerCase();
    const tagTerm = appliedTagFilter.trim().toLowerCase();

    if (!authorTerm && !tagTerm) {
      return posts;
    }

    return posts.filter((post) => {
      const matchesAuthor = authorTerm
        ? (post.authorName || '').toLowerCase().startsWith(authorTerm)
        : true;

      const matchesTag = tagTerm
        ? (post.tags || []).some((t) => (t || '').toLowerCase().startsWith(tagTerm))
        : true;

      return matchesAuthor && matchesTag;
    });
  }, [posts, appliedAuthorFilter, appliedTagFilter]);

  const handlePostCreated = () => {
    setShowPostForm(false);
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditErrors({});
    setIsEditing(false);
    setEditData({ title: '', content: '', tags: [], likes: 0 });
  };

  const handleSubmitEdit = async (post: Post) => {
    if (!editingPostId) return;
    
    try {
      await updatePost(editingPostId, {
        title: editData.title,
        content: editData.content,
        tags: editData.tags
      });
      
      setShowPostForm(false);
      setEditingPostId(null);
      setIsEditing(false);
      setEditData({ title: '', content: '', tags: [], likes: 0 });
      
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = (post: Post) => {
    if (!currentUser) return;
    if (post.authorId !== currentUser.uid) return;
    setPostToDelete(post);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    
    try {
      await deletePost(postToDelete.id);
      setConfirmOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      // Delegate to useLikedPosts, which handles optimistic update and server call
      await toggleLikeLocal(postId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDate = (timestamp: Timestamp | string | Date | null | undefined) => {
    if (!timestamp) return 'Дата неизвестна';
    
    try {
      let date: Date;
      
      // Handle Firebase Timestamp
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } 
      // Handle string or Date
      else {
        date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      }
      
      // If we still don't have a valid date, return unknown
      if (isNaN(date.getTime())) {
        return 'Date unknown';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date unknown';
    }
  };

  const cancelDelete = (): void => {
    setConfirmOpen(false);
    setPostToDelete(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
        <button
          onClick={() => currentUser ? setShowPostForm(true) : setShowAuthModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {currentUser ? 'Create Post' : 'Sign In to Post'}
        </button>
      </div>
      <PostFilters
        authorFilter={authorFilter}
        tagFilter={tagFilter}
        onAuthorFilterChange={setAuthorFilter}
        onTagFilterChange={setTagFilter}
        onApplyFilters={(author, tag) => {
          setAuthorFilter(author);
          setTagFilter(tag);
          setAppliedAuthorFilter(author);
          setAppliedTagFilter(tag);
        }}
        onResetFilters={() => {
          setAuthorFilter('');
          setTagFilter('');
          setAppliedAuthorFilter('');
          setAppliedTagFilter('');
        }}
      />
      {showPostForm ? (
        <div className="mb-8">
          <PostForm 
            currentUser={currentUser}
            formData={formData}
            setFormData={setFormData}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentUser) return;
              
              try {
                await createPost({
                  title: formData.title,
                  content: formData.content,
                  tags: formData.tags,
                  authorId: currentUser.uid,
                  authorName: currentUser.displayName || currentUser.email || 'Anonymous'
                });
                
                // Reset form
                setFormData({
                  title: '',
                  content: '',
                  tags: [],
                  likes: 0
                });
                
                // Close the form
                setShowPostForm(false);
                
                // Call success handler
                handlePostCreated();
              } catch (error) {
                console.error('Error creating post:', error);
              }
            }}
            onCancel={() => setShowPostForm(false)}
            errors={{}}
            onSuccess={handlePostCreated}
          />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPosts.map((post: Post) => (
              <PostCard
                key={post.id}
                post={post}
                editingPostId={editingPostId}
                editData={editData}
                editErrors={editErrors}
                isEditing={editingPostId === post.id}
                onToggleLike={(post) => handleLike(post.id)}
                onCancelEdit={cancelEditPost}
                onSubmitEdit={handleSubmitEdit}
                onDelete={handleDeletePost}
                onEditDataChange={(data) => setEditData(prev => ({ ...prev, ...data }))}
                formatDate={formatDate}
                isLiked={likedPostIds.includes(post.id)}
                isOwnPost={!!currentUser && post.authorId === currentUser.uid}
              />  
            ))}
          </div>
          <ConfirmDialog
            isOpen={confirmOpen}
            title="Delete this post?"
            description="This action is irreversible."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />  
        </div>
      )}
    </div>
  );
}