import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import useSWR from 'swr';

const LIKES_KEY = 'likes';

export const useLikedPosts = (userId?: string) => {
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch liked posts for the current user
  const fetchLikedPosts = async (): Promise<string[]> => {
    if (!userId) return [];
    
    try {
      setIsLoading(true);
      const likesQuery = query(
        collection(db, 'likes'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(likesQuery);
      const postIds = querySnapshot.docs.map(doc => doc.data().postId);
      return postIds;
    } catch (err) {
      console.error('Error fetching liked posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch liked posts'));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize with SWR for caching
  const { data, mutate } = useSWR(
    userId ? [LIKES_KEY, userId] : null,
    fetchLikedPosts
  );

  // Update local state when SWR data changes
  useEffect(() => {
    if (data) {
      setLikedPostIds(data);
    }
  }, [data]);

  // Toggle like status for a post
  const toggleLike = async (postId: string) => {
    if (!userId) return;

    try {
      const likeId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      const isLiked = likedPostIds.includes(postId);
      
      // Optimistic update
      const newLikedPostIds = isLiked
        ? likedPostIds.filter(id => id !== postId)
        : [...likedPostIds, postId];
      
      setLikedPostIds(newLikedPostIds);
      
      // Update Firestore
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          userId,
          postId,
          createdAt: new Date().toISOString()
        });
      }
      
      // Revalidate with SWR
      await mutate();
      
    } catch (err) {
      console.error('Error toggling like:', err);
      setError(err instanceof Error ? err : new Error('Failed to toggle like'));
      // Revert optimistic update on error
      await mutate();
    }
  };

  return {
    likedPostIds,
    isLoading,
    error,
    toggleLike,
    refetchLikes: mutate
  };
};
