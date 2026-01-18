import useSWR, { SWRConfiguration } from 'swr';

// Fetcher for SWR
const fetcher = async ([url, userId]: [string, string]) => {
  const res = await fetch(`${url}?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch liked posts');
  const data = await res.json();
  return data.postIds as string[];
};

interface UseLikedPostsOptions extends Omit<SWRConfiguration<string[]>, 'fallbackData'> {
  initialData?: string[];
  fallbackData?: string[];
}

export const useLikedPosts = (userId?: string, options: UseLikedPostsOptions = {}) => {
  const { initialData, fallbackData, ...swrConfig } = options;
  
  const { data, mutate, isLoading, error } = useSWR<string[]>(
    userId ? ['/api/likes', userId] : null,
    fetcher,
    {
      ...swrConfig,
      fallbackData: initialData || fallbackData,
      revalidateOnMount: !initialData,
    }
  );

  const likedPostIds = data || [];

  const toggleLike = async (postId: string) => {
    if (!userId) return;

    const isLiked = likedPostIds.includes(postId);
    
    // 1. Define the optimistic data (what the UI should look like immediately)
    const optimisticData = isLiked
      ? likedPostIds.filter(id => id !== postId)
      : [...likedPostIds, postId];

    // 2. Use mutate to handle the optimistic update
    await mutate(
      async () => {
        const res = await fetch('/api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, postId }),
        });
        
        if (!res.ok) throw new Error('Failed to update likes');
        
        // Return the final data (or trigger a revalidation)
        return optimisticData; 
      },
      {
        optimisticData,
        rollbackOnError: true,
        revalidate: true, // Re-sync with server after the call
      }
    );
  };

  return {
    likedPostIds,
    isLoading,
    error,
    toggleLike,
    refetchLikes: mutate,
  };
};