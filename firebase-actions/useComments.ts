import useSWR, { mutate } from 'swr';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Comment } from '../app/types';

const COMMENTS_KEY = 'comments';

// Fetcher function for SWR
const fetchComments = async (postId: string): Promise<Comment[]> => {
    
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    })) as Comment[];
    
    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

export const useComments = (postId: string) => {
  const { data: comments, error, isLoading, mutate: mutateComments } = useSWR<Comment[]>(
    postId ? [COMMENTS_KEY, postId] : null,
    () => fetchComments(postId!)
  );

  const createComment = async (commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newComment = {
        ...commentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'comments'), newComment);
      
      // Optimistic update
      const optimisticComment: Comment = {
        ...newComment,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mutateComments([optimisticComment, ...(comments || [])], false);
      
      // Revalidate
      mutateComments();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  };

  const updateComment = async (commentId: string, updates: Partial<Comment>) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      // Revalidate the comments list
      mutateComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      // Optimistic update
      const previousComments = comments || [];
      const updatedComments = previousComments.filter(comment => comment.id !== commentId);
      mutateComments(updatedComments, false);
      
      await deleteDoc(doc(db, 'comments', commentId));
      
      // Revalidate
      mutateComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      mutateComments(); // Re-fetch on error
      throw error;
    }
  };

  return {
    comments: comments || [],
    isLoading,
    error,
    createComment,
    updateComment,
    deleteComment,
    mutate: mutateComments,
  };
};

export const mutateComments = (postId: string) => {
  return mutate([COMMENTS_KEY, postId]);
};
