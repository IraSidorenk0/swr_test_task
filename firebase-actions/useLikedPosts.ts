'use server';

import { db } from '../firebase/firebase-admin';
import { Post } from '../types/post';

const LIKES_COLLECTION = 'likes';

export async function getLikedPostIds(userId: string): Promise<string[]> {
  const snapshot = await db
    .collection(LIKES_COLLECTION)
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map((doc) => (doc.data() as Post).id as string);
}

export async function toggleLike(userId: string, postId: string): Promise<string[]> {
  const likeQuery = await db
    .collection(LIKES_COLLECTION)
    .where('userId', '==', userId)
    .where('postId', '==', postId)
    .limit(1)
    .get();

  if (!likeQuery.empty) {
    // unlike
    await likeQuery.docs[0].ref.delete();
  } else {
    // like
    await db.collection(LIKES_COLLECTION).add({
      userId,
      postId,
      createdAt: new Date(),
    });
  }

  // Return updated list
  return getLikedPostIds(userId);
}