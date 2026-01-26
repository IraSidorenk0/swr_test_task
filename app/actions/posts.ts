// app/actions/posts.ts
'use server';

import { revalidatePath } from 'next/cache';
import { Post } from '../../types/post';

// In-memory storage (replace with a database in production)
let posts: Post[] = [];
let nextId = 1;

export async function getPosts(filters?: { authorId?: string; tag?: string }) {
  try {
    let result = [...posts];

    if (filters?.authorId) {
      result = result.filter(post => post.authorId === filters.authorId);
    }

    if (filters?.tag) {
      result = result.filter(post => 
        post.tags?.includes(filters.tag as string)
      );
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { data: null, error: 'Failed to fetch posts' };
  }
}

export async function getPostById(postId: string) {
  try {
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return { data: null, error: 'Post not found' };
    }
    return { data: post, error: null };
  } catch (error) {
    console.error('Error fetching post:', error);
    return { data: null, error: 'Failed to fetch post' };
  }
}

export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    const newPost: Post = {
      ...postData,
      id: `post-${nextId++}`,
      createdAt: now,
      updatedAt: now,
    };
    posts.push(newPost);
    revalidatePath('/');
    return { data: newPost, error: null };
  } catch (error) {
    console.error('Error creating post:', error);
    return { data: null, error: 'Failed to create post' };
  }
}

export async function updatePost(postId: string, updates: Partial<Post>) {
  try {
    const index = posts.findIndex(p => p.id === postId);
    if (index === -1) {
      return { error: 'Post not found' };
    }

    const updatedPost = {
      ...posts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    posts[index] = updatedPost;
    revalidatePath(`/posts/${postId}`);
    revalidatePath('/');
    return { data: updatedPost, error: null };
  } catch (error) {
    console.error('Error updating post:', error);
    return { error: 'Failed to update post' };
  }
}

export async function deletePost(postId: string) {
  try {
    posts = posts.filter(post => post.id !== postId);
    revalidatePath('/');
    return { error: null };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { error: 'Failed to delete post' };
  }
}