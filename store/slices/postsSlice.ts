'use server';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { serverTimestamp, increment } from 'firebase/firestore';
import { adminDb } from '../../firebase/firebase-admin';
import { Post } from '../../app/types';
import { PostData } from '../../app/types/post-data';

// Helper function to handle Firestore operations
const fetchPostsFromFirestore = async (authorFilter?: string, tagFilter?: string) => {
  try {
    let query = adminDb.collection('posts') as FirebaseFirestore.CollectionReference<PostData>;

    if (authorFilter?.trim()) {
      query = query.where('authorName', '==', authorFilter) as FirebaseFirestore.CollectionReference<PostData>;
    }
    if (tagFilter?.trim()) {
      query = query.where('tags', 'array-contains', tagFilter) as FirebaseFirestore.CollectionReference<PostData>;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts');
  }
};

export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async ({ authorFilter, tagFilter }: { authorFilter?: string; tagFilter?: string } = {}) => {
    return await fetchPostsFromFirestore(authorFilter, tagFilter);
  }
);

// Async thunk for creating a post
export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'comments'>, { rejectWithValue }) => {
    try {
      const docRef = await adminDb.collection('posts').add({
        ...postData,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return { id: docRef.id, ...postData };
    } catch (error) {
      console.error('Error creating post:', error);
      return rejectWithValue('Failed to create post');
    }
  }
);

// Async thunk for updating a post
export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async ({ postId, updates }: { postId: string; updates: Partial<Post> }) => {
    await adminDb.collection('posts').doc(postId).update({...updates, updatedAt: serverTimestamp()})
    
    return { postId, updates };
  }
);

// Async thunk for deleting a post
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId: string) => {
    await adminDb.collection('posts').doc(postId).delete();
    return postId;
  }
);

// Async thunk for toggling like
export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async ({ postId, userId, isLiked }: { postId: string; userId: string; isLiked: boolean }, { rejectWithValue }) => {
    try {
      const postRef = adminDb.collection('posts').doc(postId);
      const likeDocRef = postRef.collection('likes').doc(userId);
      
      // Use a transaction to ensure data consistency
      await adminDb.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) {
          throw new Error('Post not found');
        }
        
        const likeDoc = await transaction.get(likeDocRef);
        const currentLikes = postDoc.data()?.likes || 0;
        
        if (isLiked) {
          // Unlike: remove like document and decrement counter
          if (likeDoc.exists) {
            transaction.delete(likeDocRef);
            transaction.update(postRef, { 
              likes: currentLikes - 1,
              updatedAt: serverTimestamp() 
            });
          }
        } else {
          // Like: add like document and increment counter
          if (!likeDoc.exists) {
            transaction.set(likeDocRef, { 
              userId, 
              createdAt: serverTimestamp() 
            });
            transaction.update(postRef, { 
              likes: currentLikes + 1,
              updatedAt: serverTimestamp() 
            });
          }
        }
      });
      
      return { postId, increment: isLiked ? -1 : 1, isLiked: !isLiked };
    } catch (error) {
      console.error('Error toggling like:', error);
      return rejectWithValue('Failed to toggle like');
    }
  }
);

// Async thunk for fetching liked states
export const fetchLikedStates = createAsyncThunk(
  'posts/fetchLikedStates',
  async ({ posts, userId }: { posts: Post[]; userId: string }) => {
    const results = await Promise.all(posts.map(async (p) => {
      try {
        // const likeDoc = await getDoc(doc(adminDb, 'posts', p.id, 'likes', userId));
        const likeDocRef = adminDb.collection('posts').doc(p.id).collection('likes').doc(userId);
        const likeDoc = await likeDocRef.get();
        return likeDoc ? p.id : null;
      } catch {
        return null;
      }
    }));
    return results.filter(Boolean) as string[];
  }
);

export interface PostsState {
  posts: Post[];
  likedPostIds: string[];
  loading: boolean;
  error: string | null;
  filters: {
    author: string;
    tag: string;
  };
}

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    posts: [] as Post[],
    loading: false,
    error: null as string | null,
    filters: {
      author: '',
      tag: '',
    },
    likedPostIds: [] as string[],
  } as PostsState,
  reducers: {
    // Add your reducers here
    setFilters: (state, action: PayloadAction<{ author?: string; tag?: string }>) => {
      if (action.payload.author !== undefined) {
        state.filters.author = action.payload.author;
      }
      if (action.payload.tag !== undefined) {
        state.filters.tag = action.payload.tag;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    optimisticToggleLike: (state, action: PayloadAction<{ postId: string; increment: number; isLiked: boolean }>) => {
      const { postId, increment, isLiked } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.likes = Math.max(0, (post.likes || 0) + increment);
      }
      
      if (isLiked) {
        if (!state.likedPostIds.includes(postId)) {
          state.likedPostIds.push(postId);
        }
      } else {
        state.likedPostIds = state.likedPostIds.filter(id => id !== postId);
      }
    },
    revertOptimisticLike: (state, action: PayloadAction<{ postId: string; increment: number; isLiked: boolean }>) => {
      const { postId, increment, isLiked } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.likes = Math.max(0, (post.likes || 0) - increment);
      }
      
      if (isLiked) {
        state.likedPostIds = state.likedPostIds.filter(id => id !== postId);
      } else {
        if (!state.likedPostIds.includes(postId)) {
          state.likedPostIds.push(postId);
        }
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch posts';
      })
      // Add other cases for your thunks
  },
}) ;
export const { setFilters, clearError, optimisticToggleLike, revertOptimisticLike } = postsSlice.actions;
export const postsReducer = postsSlice.reducer;
