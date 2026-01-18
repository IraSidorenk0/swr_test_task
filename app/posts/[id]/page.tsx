'use server';
import { notFound } from 'next/navigation';
import PostDetailClient from '../../components/PostDetailClient';
import { getCurrentUser } from '@/firebase/auth';
import { fetchPostById } from '@/store/actions/postsActions';
import { getConnectionStatus } from '@/firebase/firebase-admin';

type Props = {
  params: {
    id: string;
  };
};

export default async function PostPage({ params }: Props) {
  const { id: postId } = params;

  // 1. Check Firebase connection status first
  const isOnline = await getConnectionStatus();
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md p-6 text-center bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Connection Error</h2>
          <p className="mb-4 text-gray-700">
            We're having trouble connecting to our services. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 2. Get current user
  const currentUser = await getCurrentUser();
  
  if (!postId) {
    notFound();
  }

  try {
    // 3. Fetch post data
    const currentPost = await fetchPostById(postId);

    if (!currentPost) {
      notFound();
    }

    // 4. Render the post with error boundary
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <PostDetailClient 
          postId={postId} 
          currentUser={currentUser} 
          currentPost={currentPost} 
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading post:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md p-6 text-center bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Post</h2>
          <p className="mb-4 text-gray-700">
            We couldn't load the requested post. Please try again later.
          </p>
          <a 
            href="/" 
            className="inline-block px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }
}