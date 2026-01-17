// app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../firebase/firebase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ comments: [] });
  }

  try {
    const snapshot = await adminDb
      .collection('comments')
      .where('postId', '==', postId)
      .get();

    const comments = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ comments });
  } catch (e) {
    console.error('Error fetching comments on server:', e);
    return NextResponse.json({ comments: [] }, { status: 500 });
  }
}