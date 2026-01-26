'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import ConfirmDialog from './ConfirmDialog';
import { AppUser, Post, PostFormData } from '../types';
import PostForm from './PostForm';
import PostCard from './PostCard';
import { PostFilters } from './PostFilters';
import { usePosts } from '../../firebase-actions/usePosts';
import { getLikedPostIds, toggleLike } from '../../firebase-actions/useLikedPosts';

export default function PostList({ currentUser, initialPosts }: { 
  currentUser: AppUser | null,
  initialPosts: Post[]
}) {
  // Filters
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  // Use the usePosts hook for posts CRUD
  const { 
    posts, 
    isLoading: isLoadingPosts,
    error: postsError,
    createPost,
    updatePost,
    deletePost,
    mutate: mutatePosts
  } = usePosts({ 
    author: authorFilter, 
    tag: tagFilter
  });

  // Use SWR to fetch and manage liked posts
  const { 
    data: likedPostIds = [], 
    mutate: mutateLikes,
    isLoading: isLoadingLikes,
    error: likesError
  } = useSWR(
    currentUser?.uid ? `liked-posts-${currentUser.uid}` : null,
    () => getLikedPostIds(currentUser!.uid),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: true,
      errorRetryCount: 2
    }
  );

  // Handle errors
  useEffect(() => {
    if (postsError) {
      console.error('Error loading posts:', postsError);
      // You might want to show a toast notification here
    }
    if (likesError) {
      console.error('Error loading likes:', likesError);
      // You might want to show a toast notification here
    }
  }, [postsError, likesError]);

  // Handle toggling like state with optimistic updates
  const toggleLikeLocal = useCallback(async (post: Post) => {
    if (!currentUser?.uid) return;

    try {
      // Optimistic update
      const newLikedPostIds = likedPostIds.includes(post.id)
        ? likedPostIds.filter(id => id !== post.id)
        : [...likedPostIds, post.id];
      
      // Update the local state immediately
      await mutateLikes(newLikedPostIds, false);
      
      // Make the API call
      try {
        await toggleLike(post.id, currentUser.uid);
        // No need to manually call mutateLikes() as SWR will revalidate
      } catch (error) {
        console.error('Error toggling like:', error);
        // Revert optimistic update
        mutateLikes();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      mutateLikes();
    }
  }, [currentUser, likedPostIds, mutateLikes]);

  const [showPostForm, setShowPostForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [formData, setFormData] = useState<PostFormData>({
    id: '',
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
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');

  // Filter posts based on author and tag
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter(post => {
      const matchesAuthor = !authorFilter || post.authorId === authorFilter;
      const matchesTag = !tagFilter || (post.tags && post.tags.includes(tagFilter));
      return matchesAuthor && matchesTag;
    });
  }, [posts, authorFilter, tagFilter]);

  // Handle loading and error states
  if (isLoadingPosts) {
    return <div className="p-4 text-center">Loading posts...</div>;
  }

  if (postsError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading posts. Please try again later.
      </div>
    );
  }

  const handlePostCreated = () => {
    setShowPostForm(false);
    setFormData({
      id: '',
      title: '',
      content: '',
      tags: [],
      likes: 0
    });
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditErrors({});
    setIsEditing(false);
    setEditData({ title: '', content: '', tags: [], likes: 0 });
  };

  // Handle creating a new post
  const handleCreatePost = useCallback(async (postData: PostFormData) => {
    if (!currentUser) return;
    
    try {
      await createPost({
        title: postData.title,
        content: postData.content,
        tags: postData.tags || [],
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        likes: 0,
        likedBy: []
      });
      
      // Reset form
      setFormData({
        id: '',
        title: '',
        content: '',
        tags: [],
        likes: 0
      });
      
      // Close the form
      setShowPostForm(false);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }, [createPost, currentUser]);

  // Handle updating a post
  const handleUpdatePost = useCallback(async (postId: string, updates: Partial<Post>) => {
    try {
      await updatePost(postId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      setEditingPostId(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }, [updatePost]);

  const handleLike = useCallback((post: Post) => {
    if (!currentUser?.uid) {
      setShowAuthModal(true);
      return;
    }
    toggleLikeLocal(post);
  }, [currentUser, toggleLikeLocal]);

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'Unknown date';
    
    try {
      const parsedDate = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(parsedDate.getTime())) {
        return 'Date unknown';
      }
      
      return parsedDate.toLocaleDateString('en-US', {
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

  const cancelDelete = useCallback((): void => {
    setConfirmOpen(false);
    setPostToDelete(null);
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!postToDelete) return;
    
    try {
      await deletePost(postToDelete.id);
      // The usePosts hook should handle updating the posts list
    } catch (error) {
      console.error('Error deleting post:', error);
      // You might want to show an error message to the user here
    } finally {
      setConfirmOpen(false);
      setPostToDelete(null);
    }
  }, [postToDelete, deletePost]);

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
                  authorName: currentUser.displayName || currentUser.email || 'Anonymous',
                  likes: 0,
                  likedBy: []
                });
                
                // Reset form
                setFormData({
                  id: '',
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
                onToggleLike={handleLike}
                onCancelEdit={cancelEditPost}
                onSubmitEdit={(post) => handleUpdatePost(post.id, editData)}
                onDelete={(post) => {
                  setPostToDelete(post);
                  setConfirmOpen(true);
                }}
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