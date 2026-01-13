'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getConnectionStatus } from '../../firebase/firebase';
import { PostFormData } from '../types';

import TagManager from './TagManager';
import UserInfo from './UserInfo';
import LoadingSpinner from './LoadingSpinner';
import { AppUser } from '../types';

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
  const [isOnline, setIsOnline] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsOnline(getConnectionStatus());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      setSubmitMessage('Error: User is not authenticated');
      return;
    }

    if (!isOnline) {
      setSubmitMessage('Error: No internet connection. Please check your connection.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const dataToValidate: PostFormData = {
        title: formData.title,
        content: formData.content,
        tags: (formData.tags || []).map((t: string | null) => (t == null ? '' : t)),
        likes: formData.likes || 0
      };

      const parsed = postSchema.safeParse(dataToValidate);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        setFieldErrors({
          title: flat.fieldErrors.title?.[0],
          content: flat.fieldErrors.content?.[0],
          tags: flat.fieldErrors.tags?.[0]
        });
        setIsSubmitting(false);
        return;
      }

      const validData = parsed.data;

      // Clean and validate tags
      const cleanedTags = validData.tags.filter(tag => tag.trim() !== '');
      if (cleanedTags.length === 0) {
        setFieldErrors({ tags: 'Добавьте хотя бы один тег' });
        setIsSubmitting(false);
        return;
      }

      const postData = {
        title: validData.title,
        content: validData.content,
        tags: cleanedTags,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email || 'Anonymous User',
      };
      
      // Use the provided onSubmit handler which will handle both create and update
      await onSubmit(e);
      
      if (isEditing) {
        setSubmitMessage('Пост успешно обновлен!');
      } else {
        setSubmitMessage('Пост успешно создан!');
        setFormData({ title: '', content: '', tags: [], likes: 0 });
      }
      
      setFieldErrors({});
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // Small delay to show success message
      }
    } catch (error: Error | unknown) {
      console.error('=== POST CREATION ERROR ===');
      console.error('Full error object:', error);
      if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error));
      }
      
      
      // More specific error messages
      let errorMessage = 'Error while creating post. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        errorMessage = 'Access error. Check Firebase Security Rules. Make sure the rules are published in Firebase Console.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'unavailable') {
        errorMessage = 'Firebase is unavailable. Check your internet connection.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'unauthenticated') {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'invalid-argument') {
        errorMessage = 'Invalid data. Check the form fields.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'failed-precondition') {
        errorMessage = 'Precondition failed. Please refresh the page.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'resource-exhausted') {
        errorMessage = 'Firebase limits exceeded. Please try again later.';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'internal') {
        errorMessage = 'Internal Firebase error. Please try again later.';
      } else if (error && typeof error === 'object' && 'message' in error && error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setSubmitMessage(errorMessage);
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
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Post title */}
        <div>
          <label htmlFor="title" className="form-label">
            📝 Title *
          </label>
          <input
            value={formData.title || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            type="text"
            id="title"
            className="form-input"
            placeholder="Enter post title..."
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
          )}
        </div>

        {/* Основной текст поста */}
        <div>
          <label htmlFor="content" className="form-label">
            📄 Content *
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            id="content"
            rows={8}
            className="form-textarea"
            placeholder="Enter post content..."
          />
          {fieldErrors.content && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.content}</p>
          )}
        </div>

        {/* Tags */}
        <TagManager
          tags={formData.tags || []}
          onTagsChange={handleTagsChange}
          error={fieldErrors.tags}
        />


        {/* Информация о пользователе */}
        <UserInfo user={currentUser} />

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !isOnline}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : !isOnline ? (
              <>📡 No connection</>
            ) : (
              <>{isEditing ? 'Update post' : 'Create post'}</>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                onCancel();
              } else {
                setFormData({ title: '', content: '', tags: [], likes: 0 });
                setFieldErrors({});
              }
            }}
            className="btn btn-secondary sm:w-auto"
          >
            {isEditing ? '❌ Cancel' : '🧹 Clear'}
          </button>
        </div>
      </form>
    </div>
  );
}