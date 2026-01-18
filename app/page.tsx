'use server';
import PostList from './components/PostList';
import { getCurrentUser } from '../firebase/auth';
import { adminDb } from '../firebase/firebase-admin';
import { Timestamp } from 'firebase/firestore';
import type { Post } from './types';

export default async function Home() {
  const authorFilter = '';
  const tagFilter = '';
  const currentUser = await getCurrentUser();
  
  // Server-side data fetching
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection('posts');
  
  if (authorFilter) {
    query = query.where('authorId', '==', authorFilter);
  }
  
  if (tagFilter) {
    query = query.where('tags', 'array-contains', tagFilter);
  }
  
  // Execute the query and get documents
  const querySnapshot = await query.get();
  
  // Transform Firestore documents to Post objects
  const posts: Post[] = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      content: data.content || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      likes: typeof data.likes === 'number' ? data.likes : 0,
      authorId: data.authorId || '',
      authorName: data.authorName || 'Anonymous',
      // Convert Firestore Timestamp to Date if needed
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date(),
    };
  });
  
  return (
    <div className="container-responsive py-8">
      <div className="text-center mb-12">
        <h1 className="text-responsive-xl font-bold text-gray-900 mb-4">
          Welcome to the blog
        </h1>
        <p className="text-responsive-base text-gray-600 max-w-2xl mx-auto">
          Modern blog created with Next.js, Firebase and Swr. 
          Share your thoughts and ideas with the community.
        </p>
      </div>
      <PostList initialPosts={posts} currentUser={currentUser}/>
    </div>
  );
}
