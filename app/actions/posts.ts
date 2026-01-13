'use server';

import { db } from '../../firebase/firebase-admin';
import { Post } from '../../types/post';

// This file contains server actions for posts
// All functions here are marked with 'use server' at the top of the file

interface GetPostsOptions {
  authorFilter?: string;
  tagFilter?: string;
}

export async function getPosts(options: GetPostsOptions = {}): Promise<Post[]> {
  if (!db) {
    throw new Error('Firebase Admin is not properly initialized. Make sure initFirebaseAdmin() is called.');
  }
  
  try {
    // Get a reference to the posts collection
    let postsRef = db.collection('posts').orderBy('createdAt', 'desc');

    // Apply filters if provided
    if (options.authorFilter) {
      postsRef = postsRef.where('authorName', '==', options.authorFilter);
    }

    // Get all posts
    const snapshot = await postsRef.get();
    
    // Map the documents to Post objects
    const posts: Post[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        // authorAvatar is optional in the Post type
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        tags: data.tags || [],
        createdAt: data.createdAt ? (typeof data.createdAt === 'object' && 'toDate' in data.createdAt ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString(),
      });
    });

    // Apply tag filter after fetching if needed
    if (options.tagFilter) {
      return posts.filter(post => 
        post.tags.some(tag => 
          tag.toLowerCase().includes(options.tagFilter?.toLowerCase() || '')
        )
      );
    }

    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts');
  }
}

// Helper function to get a single post by ID
export async function getPostById(id: string): Promise<Post | null> {
  if (!db) {
    throw new Error('Firebase Admin is not properly initialized. Make sure initFirebaseAdmin() is called.');
  }
  try {
    const doc = await db.collection('posts').doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      title: data?.title || '',
      content: data?.content || '',
      authorId: data?.authorId || '',
      authorName: data?.authorName || 'Unknown',
      authorAvatar: data?.authorAvatar || '',
      likes: data?.likes || 0,
      likedBy: data?.likedBy || [],
      tags: data?.tags || [],
      createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    throw new Error('Failed to fetch post');
  }
}
