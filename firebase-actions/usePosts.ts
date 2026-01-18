'use client';

import useSWR, { mutate } from 'swr';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Post } from '../app/types';

const POSTS_KEY = 'posts';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }
  return res.json();
};

// Fetcher function for SWR that uses the Next.js API route
export const fetchPosts = async (filters?: { author?: string; tag?: string }): Promise<Post[]> => {
  const params = new URLSearchParams();

  if (filters?.author?.trim()) {
    params.set('author', filters.author.trim());
  }
  if (filters?.tag?.trim()) {
    params.set('tag', filters.tag.trim());
  }

  const queryString = params.toString();
  const url = queryString ? `/api/posts?${queryString}` : '/api/posts';

  const data = await fetcher(url);

  const posts = (data.posts || []) as Post[];
  return posts;
};

interface UsePostsOptions {
  filters?: {
    author?: string;
    tag?: string;
  };
  initialData?: Post[];
  fallbackData?: Post[];
}

export const usePosts = (options: UsePostsOptions = {}) => {
  const { filters, initialData, fallbackData } = options;
  
  const { data: posts, error, isLoading, mutate: mutatePosts } = useSWR<Post[]>(
    [POSTS_KEY, filters],
    () => fetchPosts(filters),
    {
      fallbackData: initialData || fallbackData,
      revalidateOnMount: !initialData, // Don't revalidate on mount if we have initialData
    }
  );

  const createPost = async (postData: Pick<Post, 'title' | 'content' | 'tags' | 'authorId' | 'authorName'>) => {
    try {
      const newPost = {
        ...postData,
        likes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'posts'), newPost);
      
      // Optimistic update
      const optimisticPost: Post = {
        ...newPost,
        id: docRef.id,
        likes: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      mutatePosts([optimisticPost, ...(posts || [])], false);
      
      // Revalidate
      mutatePosts();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      // Revalidate the posts list
      mutatePosts();
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  };

  const deletePost = async (postId: string) => {
    try {
      // Optimistic update
      const previousPosts = posts || [];
      const updatedPosts = previousPosts.filter(post => post.id !== postId);
      mutatePosts(updatedPosts, false);
      
      await deleteDoc(doc(db, 'posts', postId));
      
      // Revalidate
      mutatePosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      mutatePosts(); // Re-fetch on error
      throw error;
    }
  };

  return {
    posts: posts || [],
    isLoading,
    error,
    createPost,
    updatePost,
    deletePost,
    mutate: mutatePosts,
  };
};

export const mutatePosts = () => {
  return mutate(POSTS_KEY);
};

export const getPostById = async (postId: string) => {
 const { data, mutate, isLoading, error } = useSWR(
    postId ? ['/api/posts', postId] : null,
    fetcher
  );
  return data;
};
