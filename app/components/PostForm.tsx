'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase/firebase';
import { AppUser, PostFormData } from '../types';
import LoadingSpinner from './LoadingSpinner';

// Zod schema for post validation
const postSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .min(5, 'Title must contain at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  content: z.string()
    .min(1, 'Content is required')
    .min(10, 'Content must contain at least 10 characters')
    .max(5000, 'Main text cannot exceed 5000 characters'),
  tags: z.array(z.string())
    .min(1, 'Add at least one tag')
    .max(10, 'Maximum 10 tags')
    .refine(tags => tags.every(tag => tag.trim().length > 0), {
      message: 'Tags cannot be empty'
    }),
  likes: z.number().optional()
});

interface PostFormProps {
  currentUser: AppUser | null;
  formData: PostFormData;
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  errors: Record<string, string>;
  isEditing?: boolean;
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

export default function PostForm({
  currentUser,
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  errors, 
  isEditing = false,
  onSuccess 
}: PostFormProps) {
  const [user, loading, error] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitMessage, setSubmitMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation can still happen here
    const result = postSchema.safeParse(formData);
    if (!result.success) {
      const errors = result.error.issues.reduce((acc, issue) => {
        const key = issue.path[0];
        if (key !== undefined) {
          acc[String(key)] = issue.message;
        }
        return acc;
      }, {} as Record<string, string>);
      setFieldErrors(errors);
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage('');
    try {
      await onSubmit(e);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting post:', error);
      setSubmitMessage('An error occurred while saving the post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Auth error: {error.message}</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authorization required</h2>
          <p className="text-gray-600">To create a post, you need to log in to the system</p>
        </div>
      </div>
    );
  } 

  const createPost = () => {
    // Logic to open the PostForm modal or navigate to the PostForm page
    // setShowPostForm(true);
  }
  

  return (
    <div className="max-w-2xl mx-auto card p-6 animate-fade-in">
      <h3 className="text-responsive-lg font-bold mb-6 text-center text-gray-900 flex items-center justify-center gap-2" onClick={createPost}>
        {isEditing ? '✍️ Edit post' : '✍️ Create new post'}
      </h3>        
      
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your existing form fields */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 text-white rounded-md ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="lg" />
              <span className="ml-2">{isEditing ? 'Updating...' : 'Creating...'}</span>
            </>
          ) : isEditing ? (
            'Update Post'
          ) : (
            'Create Post'
          )}
        </button>
      </div>
      {submitMessage && (
        <div className={`p-4 rounded-md ${
          submitMessage.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {submitMessage}
        </div>
      )}
      </form>
    </div>
  );
}