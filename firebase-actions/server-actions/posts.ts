'use server';

import { createPost } from '@/app/actions/posts';
// deletePost is defined in this file
import { revalidatePath } from 'next/cache';
import { getFirestore } from 'firebase-admin/firestore';
import { Post } from '@/app/types';

const db = getFirestore();

// Fetch all posts with optional filtering
export async function fetchPosts(filters?: { author?: string; tag?: string }) {
  try {
    let postsQuery = db.collection('posts').orderBy('createdAt', 'desc');
    
    if (filters?.author) {
      postsQuery = postsQuery.where('authorId', 'array-contains', filters.author);
    }
    if (filters?.tag) {
      postsQuery = postsQuery.where('tags', 'array-contains', filters.tag);
    }

    const querySnapshot = await postsQuery.get();
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];

    return { data: posts, error: null };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { data: [], error: 'Failed to fetch posts' };
  }
}

// Fetch a single post by ID
export async function fetchPostById(postId: string) {
  try {
    const docRef = db.collection('posts').doc(postId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return { data: null, error: 'Post not found' };
    }

    return { 
      data: { 
        id: docSnap.id, 
        ...docSnap.data() 
      } as Post, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return { data: null, error: 'Failed to fetch post' };
  }
}

// Update post function
export async function updatePost(postId: string, updates: Partial<Post>) {
  try {
    await db.collection('posts').doc(postId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: 'Failed to update post' };
  }
}

export async function createPostHandler(postData: Parameters<typeof createPost>[0]) {
  try {
    const postId = await createPost(postData);
    revalidatePath('/');
    return { data: postId, error: null };
  } catch (error) {
    console.error('Error creating post:', error);
    return { data: null, error: 'Failed to create post' };
  }
}

export async function updateExistingPost(postId: string, updates: Parameters<typeof updatePost>[1]) {
  try {
    await updatePost(postId, updates);
    revalidatePath('/');
    revalidatePath(`/posts/${postId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: 'Failed to update post' };
  }
}

export async function removePost(postId: string) {
  try {
    await db.collection('posts').doc(postId).delete();
    revalidatePath('/');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: 'Failed to delete post' };
  }
}