// app/api/posts
import { adminDb } from '../../../firebase/firebase-admin';
import { NextResponse, NextRequest } from 'next/server';

export async function GET() {
    try {
        const snapshot = await adminDb
          .collection('posts')
          .get();
    
        const posts = snapshot.docs.map(doc => doc.data());
        return NextResponse.json({ posts });
      } catch (e) {
        console.error('Error fetching posts on server:', e);
        return NextResponse.json({ posts: [] }, { status: 500 });
      }
}


export async function GET_POST_BY_ID(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  const { postId } = context.params;

  if (!postId) {
    return NextResponse.json(
      { error: 'Post ID is required' },
      { status: 400 }
    );
  }

  try {
    const snapshot = await adminDb
      .collection('posts')
      .where('id', '==', postId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const posts = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ posts });
  } catch (e) {
    console.error('Error fetching post on server:', e);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}