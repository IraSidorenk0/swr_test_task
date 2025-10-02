import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, increment, getDoc, setDoc, where, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Post } from '../../app/types';

// Async thunk for fetching posts
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async ({ authorFilter, tagFilter }: { authorFilter?: string; tagFilter?: string } = {}) => {
    console.log('🔄 Fetching posts from Firestore...');
    const baseConstraints: any[] = [];
    
    if (authorFilter?.trim()) {
      baseConstraints.push(where('authorName', '==', authorFilter.trim()));
    }
    if (tagFilter?.trim()) {
      baseConstraints.push(where('tags', 'array-contains', tagFilter.trim()));
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
    
    console.log(`📊 Found ${querySnapshot.size} posts in Firestore`);
    
    const fetchedPosts: Post[] = [];
    querySnapshot.forEach((snapshotDoc) => {
      console.log('📝 Processing post:', snapshotDoc.id, snapshotDoc.data());
      const data = snapshotDoc.data() as any;
      fetchedPosts.push({
        id: snapshotDoc.id,
        title: data?.title,
        content: data?.content,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        likes: typeof data?.likes === 'number' ? data.likes : 0,
        authorId: data?.authorId,
        authorName: data?.authorName,
        createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
      } as Post);
    });
    
    let resultPosts = [...fetchedPosts];

    // If exact Firestore match yielded no results, try client-side partial filtering
    const hasAnyApplied = Boolean(authorFilter?.trim() || tagFilter?.trim());
    if (hasAnyApplied && resultPosts.length === 0) {
      try {
        const allSnapshot = await getDocs(query(collection(db, 'posts')));
        const allPosts: Post[] = [];
        allSnapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data() as any;
          allPosts.push({
            id: snapshotDoc.id,
            title: data?.title,
            content: data?.content,
            tags: Array.isArray(data?.tags) ? data.tags : [],
            likes: typeof data?.likes === 'number' ? data.likes : 0,
            authorId: data?.authorId,
            authorName: data?.authorName,
            createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
            updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
          } as Post);
        });
        const authorTerm = authorFilter?.trim().toLowerCase();
        const tagTerm = tagFilter?.trim().toLowerCase();
        resultPosts = allPosts.filter(p => {
          const matchesAuthor = authorTerm ? (p.authorName || '').toLowerCase().startsWith(authorTerm) : true;
          const matchesTag = tagTerm ? (p.tags || []).some(t => (t || '').toLowerCase().startsWith(tagTerm)) : true;
          return matchesAuthor && matchesTag;
        });
      } catch (fallbackErr) {
        console.warn('Partial filter fallback failed:', fallbackErr);
      }
    }

    // Sort by createdAt desc client-side
    const sorted = [...resultPosts].sort((a, b) => {
      const ta: any = a.createdAt;
      const tb: any = b.createdAt;
      const va = ta && typeof ta.toMillis === 'function' ? ta.toMillis() : (ta ? new Date(ta).getTime() : 0);
      const vb = tb && typeof tb.toMillis === 'function' ? tb.toMillis() : (tb ? new Date(tb).getTime() : 0);
      return vb - va;
    });
    
    console.log(`✅ Successfully loaded ${sorted.length} posts`);
    return sorted;
  }
);

// Async thunk for creating a post
export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: {
    title: string;
    content: string;
    tags: string[];
    authorId: string;
    authorName: string;
  }) => {
    const timestamp = new Date().toISOString();
    
    const newPostData = {
      ...postData,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtFallback: timestamp,
    };
    
    console.log('🔄 Attempting to create Firestore collection reference...');
    const postsCollection = collection(db, 'posts');
    
    // Add timeout to detect hanging operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
    });
    
    const addDocPromise = addDoc(postsCollection, newPostData);
    
    let docRef: any;
    try {
      // Try the normal addDoc method first
      docRef = await Promise.race([addDocPromise, timeoutPromise]);
    } catch (primaryError) {
      console.log('⚠️  Primary method failed, trying alternative approach...');
      console.log('   Primary error:', primaryError);
      
      // Alternative approach: Use setDoc with auto-generated ID
      try {
        const alternativeDocRef = doc(collection(db, 'posts'));
        const alternativePostData = {
          ...newPostData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('🔄 Trying alternative method with setDoc...');
        await setDoc(alternativeDocRef, alternativePostData);
        docRef = alternativeDocRef;
        console.log('✅ Alternative method succeeded!');
      } catch (alternativeError) {
        console.error('❌ Alternative method also failed:', alternativeError);
        throw primaryError;
      }
    }
    
    return {
      id: docRef.id,
      ...postData,
      likes: 0,
      createdAt: new Date().toISOString(), // Convert to serializable string
      updatedAt: new Date().toISOString(), // Convert to serializable string
    } as Post;
  }
);

// Async thunk for updating a post
export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async ({ postId, updates }: { postId: string; updates: Partial<Post> }) => {
    await updateDoc(doc(db, 'posts', postId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { postId, updates };
  }
);

// Async thunk for deleting a post
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId: string) => {
    await deleteDoc(doc(db, 'posts', postId));
    return postId;
  }
);

// Async thunk for toggling like
export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async ({ postId, userId, isLiked }: { postId: string; userId: string; isLiked: boolean }) => {
    const likeDocRef = doc(db, 'posts', postId, 'likes', userId);
    
    if (isLiked) {
      // Unlike: remove like document and decrement counter
      await deleteDoc(likeDocRef);
      await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
      return { postId, increment: -1, isLiked: false };
    } else {
      // Like: add like document and increment counter
      await setDoc(likeDocRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
      return { postId, increment: 1, isLiked: true };
    }
  }
);

// Async thunk for fetching liked states
export const fetchLikedStates = createAsyncThunk(
  'posts/fetchLikedStates',
  async ({ posts, userId }: { posts: Post[]; userId: string }) => {
    const results = await Promise.all(posts.map(async (p) => {
      try {
        const likeDoc = await getDoc(doc(db, 'posts', p.id, 'likes', userId));
        return likeDoc.exists() ? p.id : null;
      } catch {
        return null;
      }
    }));
    return results.filter(Boolean) as string[];
  }
);

interface PostsState {
  posts: Post[];
  likedPostIds: string[];
  loading: boolean;
  error: string | null;
  filters: {
    author: string;
    tag: string;
  };
}

const initialState: PostsState = {
  posts: [],
  likedPostIds: [],
  loading: false,
  error: null,
  filters: {
    author: '',
    tag: '',
  },
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
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
    // Optimistic updates for likes
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
    // Revert optimistic updates on failure
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
      // Fetch posts
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch posts';
      })
      // Create post
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload); // Add to beginning of array
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create post';
      })
      // Update post
      .addCase(updatePost.fulfilled, (state, action) => {
        const { postId, updates } = action.payload;
        const postIndex = state.posts.findIndex(p => p.id === postId);
        if (postIndex !== -1) {
          state.posts[postIndex] = { ...state.posts[postIndex], ...updates };
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update post';
      })
      // Delete post
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(p => p.id !== action.payload);
        state.likedPostIds = state.likedPostIds.filter(id => id !== action.payload);
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete post';
      })
      // Toggle like
      .addCase(toggleLike.fulfilled, (state, action) => {
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
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to toggle like';
      })
      // Fetch liked states
      .addCase(fetchLikedStates.fulfilled, (state, action) => {
        state.likedPostIds = action.payload;
      });
  },
});

export const { setFilters, clearError, optimisticToggleLike, revertOptimisticLike } = postsSlice.actions;
export default postsSlice.reducer;
