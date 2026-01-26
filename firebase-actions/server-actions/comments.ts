'use server';

import { db } from '../../firebase/firebase-admin';
import type { Comment } from '../../app/types';

const COMMENTS_COLLECTION = 'comments';

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const snapshot = await db
      .collection(COMMENTS_COLLECTION)
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .get();

    const comments: Comment[] = snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
      };
    });

    return comments;
  } catch (error) {
    console.error('Error fetching comments (admin):', error);
    throw error;
  }
}

export async function createComment(
  commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const now = new Date();
    const newComment = {
      ...commentData,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(COMMENTS_COLLECTION).add(newComment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating comment (admin):', error);
    throw error;
  }
}

export async function updateComment(
  commentId: string,
  updates: Partial<Comment>
): Promise<boolean> {
  try {
    await db
      .collection(COMMENTS_COLLECTION)
      .doc(commentId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });
    return true;
  } catch (error) {
    console.error('Error updating comment (admin):', error);
    return false;
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    await db.collection(COMMENTS_COLLECTION).doc(commentId).delete();
  } catch (error) {
    console.error('Error deleting comment (admin):', error);
    throw error;
  }
}
