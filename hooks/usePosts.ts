import useSWR, { mutate } from 'swr';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Post } from '../app/types';

const POSTS_KEY = 'posts';

// Fetcher function for SWR
const fetchPosts = async (filters?: { author?: string; tag?: string }): Promise<Post[]> => {
  const baseConstraints: any[] = [];
  
  if (filters?.author?.trim()) {
    baseConstraints.push(where('authorName', '==', filters.author.trim()));
  }
  if (filters?.tag?.trim()) {
    baseConstraints.push(where('tags', 'array-contains', filters.tag.trim()));
  }

  let querySnapshot;
  try {
    const withOrder = query(collection(db, 'posts'), ...baseConstraints, orderBy('createdAt', 'desc'));
    querySnapshot = await getDocs(withOrder);
  } catch (e: any) {
    // If an index is required, retry without orderBy and sort client-side
    const message = (e && e.message) || '';
    if (message.includes('index') || message.includes('FAILED_PRECONDITION')) {
      console.warn('⚠️ Missing index, retrying without orderBy and sorting client-side');
      const withoutOrder = query(collection(db, 'posts'), ...baseConstraints);
      querySnapshot = await getDocs(withoutOrder);
    } else {
      throw e;
    }
  } 
  
  const posts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
      likes: typeof data.likes === 'number' ? data.likes : 0,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString(),
    } as unknown as Post;
  });
  const getDateValue = (date: string | Timestamp | Date): number => {
    if (date instanceof Timestamp) {
      return date.toMillis();
    }
    return new Date(date).getTime();
  };
  
  // If we had to sort client-side, do it now
  const queryOrderBy = (querySnapshot.query as any).orderBy;
  if (!queryOrderBy || queryOrderBy.length === 0) {
    return posts.sort((a, b) => 
      getDateValue(b.createdAt) - getDateValue(a.createdAt)
    );
  }
  
  return posts;
};

export const usePosts = (filters?: { author?: string; tag?: string }) => {
  const { data: posts, error, isLoading, mutate: mutatePosts } = useSWR<Post[]>(
    [POSTS_KEY, filters],
    () => fetchPosts(filters)
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
