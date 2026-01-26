'use client';

import { useCallback } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import { 
  getComments as getCommentsAction, 
  createComment as createCommentAction, 
  updateComment as updateCommentAction, 
  deleteComment as deleteCommentAction 
} from './server-actions/comments';
import type { Comment } from '../app/types';

const COMMENTS_KEY = (postId: string) => ['comments', postId];

export function useComments(postId: string) {
  const { data: comments = [], error, isLoading, mutate } = useSWR<Comment[]>(
    postId ? COMMENTS_KEY(postId) : null,
    () => getCommentsAction(postId).then(res => res)
  );

  const getComments = useCallback(async (postId: string): Promise<Comment[]> => {
    return getCommentsAction(postId);
  }, []);

  const createComment = useCallback(async (commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
      const newCommentId = await createCommentAction(commentData);
      if (newCommentId) {
        // Optimistic update
        await mutate(async (currentComments = []) => {
          return [...currentComments, { 
            ...commentData, 
            id: newCommentId, 
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Comment];
        }, false);
        // Revalidate
        await mutate();
      }
      return newCommentId;
    } catch (err) {
      console.error('Failed to create comment:', err);
      return null;
    }
  }, [postId, mutate]);

  const updateComment = useCallback(async (commentId: string, updates: Partial<Comment>): Promise<boolean> => {
    try {
      const success = await updateCommentAction(commentId, updates);
      if (success) {
        // Optimistic update
        await mutate(async (currentComments = []) => {
          return currentComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, ...updates, updatedAt: new Date().toISOString() } 
              : comment
          );
        }, false);
        // Revalidate
        await mutate();
      }
      return success;
    } catch (err) {
      console.error('Failed to update comment:', err);
      return false;
    }
  }, [postId, mutate]);

  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    try {
      await deleteCommentAction(commentId);
      // Optimistic update
      await mutate(async (currentComments: Comment[] = []) => {
        return currentComments.filter(comment => comment.id !== commentId);
      }, false);
      // Revalidate
      await mutate();
      return true;
    } catch (err) {
      console.error('Failed to delete comment:', err);
      return false;
    }
  }, [postId, mutate]);

  return {
    comments,
    getComments,
    createComment,
    updateComment,
    deleteComment,
    isLoading,
    error,
    mutate
  };
}