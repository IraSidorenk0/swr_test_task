'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Post, PostFormData, AppUser } from '../types';
import PostForm from './PostForm';
import { usePosts } from '../../firebase-actions/usePosts';
import toast from 'react-hot-toast';

type EditPostFormProps = {
  postId: string;
  currentPost: Post | null;
  currentUser: AppUser | null;
};

export default function EditPostForm({ postId, currentPost, currentUser }: EditPostFormProps) {
  const router = useRouter();
  const { updatePost } = usePosts();
  
  const [post, setPost] = useState<Post | null>(currentPost);
  const [loading, setLoading] = useState(!currentPost);
  const [formData, setFormData] = useState<PostFormData>({ 
    id: postId,
    title: currentPost?.title || '', 
    content: currentPost?.content || '', 
    tags: currentPost?.tags || [], 
    likes: currentPost?.likes || 0,
    ...(currentPost?.likedBy && { likedBy: currentPost.likedBy })
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validationErrors: Record<string, string> = {};
    if (!formData.title.trim()) validationErrors.title = 'Title is required';
    if (!formData.content.trim()) validationErrors.content = 'Content is required';
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (!postId || !currentUser) return;
    try {
    const updatedPost = {
      ...formData,
      updatedAt: new Date(),
      authorId: currentUser.uid,
      authorName: currentUser.displayName || 'Anonymous',
      createdAt: currentPost?.createdAt || new Date(),
    } as Omit<Post, 'id' | 'updatedAt'> & { updatedAt: Date };

    await updatePost(postId, updatedPost);

    router.push(`/posts/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      setErrors({ submit: 'Failed to update post. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-600">Post not found</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validationErrors: Record<string, string> = {};
    if (!formData.title.trim()) validationErrors.title = 'Title is required';
    if (!formData.content.trim()) validationErrors.content = 'Content is required';
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    if (!postId || !currentUser) return;
    
    try {
      const updatedPost = {
        ...formData,
        updatedAt: new Date(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        createdAt: currentPost?.createdAt || new Date(),
      } as Omit<Post, 'id' | 'updatedAt'> & { updatedAt: Date };

      await updatePost(postId, updatedPost);
      toast.success('Post updated successfully!');
      router.push(`/posts/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      setErrors({ submit: 'Failed to update post. Please try again.' });
      toast.error('Failed to update post. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PostForm 
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        isSubmitting={false} 
        isEditing={true}
        currentUser={currentUser} 
        onCancel={() => router.back()}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
