'use server';

import { getFirebaseAdmin } from '@/firebase/firebase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth.config';

export type CreateCommentResponse = {
  success: boolean;
  commentId?: string;
  error?: string;
};

export async function createComment(commentData: { 
  content: string; 
  postId: string 
}): Promise<CreateCommentResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Пользователь не авторизован');
    }

    const { adminAuth, adminDb } = getFirebaseAdmin();
    const user = await adminAuth.getUserByEmail(session.user.email);
    
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const commentRef = await adminDb.collection('comments').add({
      content: commentData.content,
      postId: commentData.postId,
      authorId: user.uid,
      authorName: user.displayName || user.email?.split('@')[0] || 'Аноним',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { 
      success: true, 
      commentId: commentRef.id 
    };
  } catch (error) {
    console.error('Ошибка при создании комментария:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Произошла ошибка при создании комментария' 
    };
  }
}
