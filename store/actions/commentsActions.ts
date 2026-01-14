import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import type { Comment } from '../../app/types';

// Plain async helper for fetching comments for a specific post (usable in server components or SWR)
export async function fetchCommentsForPost(postId: string): Promise<Comment[]> {
  if (!postId) {
    return [];
  }

  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(commentsQuery);

    const fetchedComments: Comment[] = [];
    querySnapshot.forEach((snapshotDoc) => {
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

    return fetchedComments;
  } catch (e) {
    console.error('Error fetching comments for post:', e);
    return [];
  }
}

