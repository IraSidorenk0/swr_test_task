'use client';

import dynamic from 'next/dynamic';
import { SerializedPost } from '../../../types/index';
import { AppUser } from '../../../types/index';

// Dynamically import the client component with no SSR
const EditPostForm = dynamic(
  () => import('../../../components/EditPostForm'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function EditPostClient({ 
  post, 
  currentUser, 
  postId 
}: { 
  post: SerializedPost;
  currentUser: AppUser;
  postId: string;
}) {
  // Convert string timestamps back to Date objects for the form
  const postWithDates = {
    ...post,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt)
  };

  return (
    <EditPostForm 
      currentPost={postWithDates} 
      currentUser={currentUser} 
      postId={postId} 
    />
  );
}
