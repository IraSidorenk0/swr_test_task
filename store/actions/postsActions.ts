import { collection, query, orderBy, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Post } from '../../app/types';

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

export async function getPosts(authorFilter?: string, tagFilter?: string): Promise<Post[]> {
  const baseConstraints: any[] = [];

  if (authorFilter?.trim()) {
    baseConstraints.push(where('authorName', '==', authorFilter.trim()));
  }
  if (tagFilter?.trim()) {
    baseConstraints.push(where('tags', 'array-contains', tagFilter.trim()));
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

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data?.title || '',
      content: data?.content || '',
      tags: Array.isArray(data?.tags) ? data.tags : [],
      likes: typeof data?.likes === 'number' ? data.likes : 0,
      authorId: data?.authorId || '',
      authorName: data?.authorName || '',
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt || new Date().toISOString(),
    } as Post;
  });
}

