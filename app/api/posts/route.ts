// app/api/posts
import { adminDb } from '../../../firebase/firebase-admin';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const author = searchParams.get('author') || '';
    const tag = searchParams.get('tag') || '';

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection('posts');

    if (author) {
      query = query.where('authorId', '==', author);
    }

    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }

    const snapshot = await query.get();
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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