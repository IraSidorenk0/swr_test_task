import { collection, query, orderBy, getDocs, doc, getDoc, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Post } from '../../app/types';

export async function fetchPosts(filters?: { author?: string; tag?: string }): Promise<Post[]> {
  const baseConstraints: any[] = [];

  if (filters?.author?.trim()) {
    baseConstraints.push(where('authorName', '==', filters.author.trim()));
  }
  if (filters?.tag?.trim()) {
    baseConstraints.push(where('tags', 'array-contains', filters.tag.trim()));
  }

  let querySnapshot;
  try {
    const withOrder = query(collection(db, 'posts'), ...baseConstraints, orderBy('createdAt', 'desc'));
    querySnapshot = await getDocs(withOrder);
  } catch (e: any) {
    const message = (e && e.message) || '';
    if (message.includes('index') || message.includes('FAILED_PRECONDITION')) {
      console.warn('⚠️ Missing index, retrying without orderBy and sorting client-side');
      const withoutOrder = query(collection(db, 'posts'), ...baseConstraints);
      querySnapshot = await getDocs(withoutOrder);
    } else {
      throw e;
    }
  }

  const posts = querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
      likes: typeof data.likes === 'number' ? data.likes : 0,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date(data.createdAt).toISOString(),
      updatedAt:
        data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : new Date(data.updatedAt).toISOString(),
    } as Post;
  });

  const getDateValue = (date: string | Timestamp | Date): number => {
    if (date instanceof Timestamp) {
      return date.toMillis();
    }
    return new Date(date).getTime();
  };

  const queryOrderBy = (querySnapshot.query as any).orderBy;
  if (!queryOrderBy || queryOrderBy.length === 0) {
    return posts.sort((a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt));
  }

  return posts;
}

// Plain async helper for fetching a single post by ID (usable in server components or SWR)
export async function fetchPostById(postId: string): Promise<Post | null> {
  try {
    if (!postId) {
      throw new Error('Post ID is required');
    }

    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return null;
    }

    const postData = postDoc.data() as any;
    return {
      id: postDoc.id,
      title: postData.title,
      content: postData.content,
      tags: Array.isArray(postData.tags) ? postData.tags : [],
      likes: typeof postData.likes === 'number' ? postData.likes : 0,
      authorId: postData.authorId,
      authorName: postData.authorName,
      createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : postData.createdAt,
      updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate().toISOString() : postData.updatedAt,
    } as Post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

