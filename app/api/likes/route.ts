// app/api/likes/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '../../../firebase/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ postIds: [] });

  try {
    const snapshot = await adminDb
      .collection('likes')
      .where('userId', '==', userId)
      .get();

    const postIds = snapshot.docs.map(doc => doc.data().postId as string);
    return NextResponse.json({ postIds });
  } catch (e) {
    console.error('Error fetching liked posts on server:', e);
    return NextResponse.json({ postIds: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, postId } = body;
  if (!userId || !postId) {
    return NextResponse.json({ error: 'Missing userId or postId' }, { status: 400 });
  }

  try {
    const likeRef = adminDb.collection('likes').doc(`${userId}_${postId}`);
    const postRef = adminDb.collection('posts').doc(postId);

    const result = await adminDb.runTransaction(async (tx) => {
      const likeSnap = await tx.get(likeRef);
      const postSnap = await tx.get(postRef);

      const postData = postSnap.exists ? postSnap.data() as { likes?: number } : {};
      const currentLikes = typeof postData.likes === 'number' ? postData.likes : 0;

      if (likeSnap.exists) {
        // Currently liked -> unlike
        tx.delete(likeRef);
        const newLikes = Math.max(currentLikes - 1, 0);
        tx.set(postRef, { ...postData, likes: newLikes }, { merge: true });
        return { isLiked: false, likes: newLikes };
      } else {
        // Currently not liked -> like
        tx.set(likeRef, {
          userId,
          postId,
          createdAt: new Date().toISOString(),
        });
        const newLikes = currentLikes + 1;
        tx.set(postRef, { ...postData, likes: newLikes }, { merge: true });
        return { isLiked: true, likes: newLikes };
      }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('Error toggling like on server:', e);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}