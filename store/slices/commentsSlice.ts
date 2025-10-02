import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, addDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import type { Comment } from '../../app/types';

// Async thunk for fetching comments for a specific post
export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async (postId: string) => {
    console.log('🔄 Fetching comments from Firestore for post:', postId);
    
    let querySnapshot;
    try {
      const commentsQuery = query(
        collection(db, 'comments'), 
        where('postId', '==', postId),
        orderBy('createdAt', 'desc')
      );
      querySnapshot = await getDocs(commentsQuery);
    } catch (e: any) {
      // If an index is required, retry without orderBy and sort client-side
      const message = (e && e.message) || '';
      if (message.includes('index') || message.includes('FAILED_PRECONDITION')) {
        console.warn('⚠️ Missing index, retrying without orderBy and sorting client-side');
        const withoutOrder = query(collection(db, 'comments'), where('postId', '==', postId));
        querySnapshot = await getDocs(withoutOrder);
      } else {
        throw e;
      }
    }
    
    console.log(`📊 Found ${querySnapshot.size} comments in Firestore`);
    
    const fetchedComments: Comment[] = [];
    querySnapshot.forEach((snapshotDoc) => {
      console.log('💬 Processing comment:', snapshotDoc.id, snapshotDoc.data());
      const data = snapshotDoc.data() as any;
      fetchedComments.push({
        id: snapshotDoc.id,
        content: data?.content,
        postId: data?.postId,
        authorId: data?.authorId,
        authorName: data?.authorName,
        createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
      } as Comment);
    });
    
    // Sort by createdAt desc client-side
    const sorted = [...fetchedComments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    console.log(`✅ Successfully loaded ${sorted.length} comments`);
    return { postId, comments: sorted };
  }
);

// Async thunk for creating a comment
export const createComment = createAsyncThunk(
  'comments/createComment',
  async (commentData: {
    content: string;
    postId: string;
    authorId: string;
    authorName: string;
  }) => {
    const newCommentData = {
      ...commentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log('🔄 Attempting to create comment...');
    const commentsCollection = collection(db, 'comments');
    
    // Add timeout to detect hanging operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
    });
    
    const addDocPromise = addDoc(commentsCollection, newCommentData);
    
    let docRef: any;
    try {
      // Try the normal addDoc method first
      docRef = await Promise.race([addDocPromise, timeoutPromise]);
    } catch (primaryError) {
      console.log('⚠️  Primary method failed, trying alternative approach...');
      console.log('   Primary error:', primaryError);
      
      // Alternative approach: Use setDoc with auto-generated ID
      try {
        const alternativeDocRef = doc(collection(db, 'comments'));
        const alternativeCommentData = {
          ...newCommentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('🔄 Trying alternative method with setDoc...');
        await setDoc(alternativeDocRef, alternativeCommentData);
        docRef = alternativeDocRef;
        console.log('✅ Alternative method succeeded!');
      } catch (alternativeError) {
        console.error('❌ Alternative method also failed:', alternativeError);
        throw primaryError;
      }
    }
    
    return {
      id: docRef.id,
      ...commentData,
      createdAt: new Date().toISOString(), // Convert to serializable string
      updatedAt: new Date().toISOString(), // Convert to serializable string
    } as Comment;
  }
);

// Async thunk for updating a comment
export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, updates }: { commentId: string; updates: Partial<Comment> }) => {
    await updateDoc(doc(db, 'comments', commentId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { commentId, updates };
  }
);

// Async thunk for deleting a comment
export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId: string) => {
    await deleteDoc(doc(db, 'comments', commentId));
    return commentId;
  }
);

interface CommentsState {
  commentsByPost: Record<string, Comment[]>;
  loading: boolean;
  error: string | null;
}

const initialState: CommentsState = {
  commentsByPost: {},
  loading: false,
  error: null,
};

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCommentsForPost: (state, action: PayloadAction<string>) => {
      delete state.commentsByPost[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        const { postId, comments } = action.payload;
        state.commentsByPost[postId] = comments;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch comments';
      })
      // Create comment
      .addCase(createComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.loading = false;
        const comment = action.payload;
        const postId = comment.postId;
        
        if (!state.commentsByPost[postId]) {
          state.commentsByPost[postId] = [];
        }
        
        // Add to beginning of array (newest first)
        state.commentsByPost[postId].unshift(comment);
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create comment';
      })
      // Update comment
      .addCase(updateComment.fulfilled, (state, action) => {
        const { commentId, updates } = action.payload;
        
        // Find and update the comment in the appropriate post's comments
        Object.keys(state.commentsByPost).forEach(postId => {
          const commentIndex = state.commentsByPost[postId].findIndex(c => c.id === commentId);
          if (commentIndex !== -1) {
            state.commentsByPost[postId][commentIndex] = { 
              ...state.commentsByPost[postId][commentIndex], 
              ...updates 
            };
          }
        });
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update comment';
      })
      // Delete comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        const commentId = action.payload;
        
        // Remove the comment from the appropriate post's comments
        Object.keys(state.commentsByPost).forEach(postId => {
          state.commentsByPost[postId] = state.commentsByPost[postId].filter(c => c.id !== commentId);
        });
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete comment';
      });
  },
});

export const { clearError, clearCommentsForPost } = commentsSlice.actions;
export default commentsSlice.reducer;
