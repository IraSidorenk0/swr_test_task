// Server-side functions
export * from './server-actions/posts';

// Client-side hooks
'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import type { Post } from '../app/types';
import { 
  fetchPosts as serverFetchPosts,
  fetchPostById as serverFetchPostById,
  createPostHandler as serverCreatePost,
  updateExistingPost as serverUpdatePost,
  removePost as serverDeletePost
} from './server-actions/posts';

export function usePosts(filters?: { author?: string; tag?: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['posts', filters],
    () => serverFetchPosts(filters).then(res => res.data)
  );

  const createPost = useCallback(async (postData: Parameters<typeof serverCreatePost>[0]) => {
    const { data: postId, error } = await serverCreatePost(postData);
    if (error) throw new Error(error);
    await mutate();
    return postId;
  }, [mutate]);

  const updatePost = useCallback(async (postId: string, updates: Parameters<typeof serverUpdatePost>[1]) => {
    const { error } = await serverUpdatePost(postId, updates);
    if (error) throw new Error(error);
    await mutate();
  }, [mutate]);

  const deletePost = useCallback(async (postId: string) => {
    const { error } = await serverDeletePost(postId);
    if (error) throw new Error(error);
    await mutate();
  }, [mutate]);

  return {
    posts: data || [],
    isLoading,
    error,
    createPost,
    updatePost,
    deletePost,
    mutate
  };
}

export function usePost(postId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ['post', postId],
    () => serverFetchPostById(postId).then((res: { data: Post | null; error: string | null }) => res.data)
  );

  const updatePost = useCallback(async (updates: Parameters<typeof serverUpdatePost>[1]) => {
    const { error } = await serverUpdatePost(postId, updates);
    if (error) throw new Error(error);
    await mutate();
  }, [postId, mutate]);

  return {
    post: data,
    isLoading,
    error,
    updatePost,
    mutate
  };
}