import { notFound } from 'next/navigation';
import PostDetailClient from '../../components/PostDetailClient';
import { getCurrentUser } from '@/firebase/auth';
import { fetchPostById } from '@/store/slices/postsActions';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PostPage({ params }: Props) {
  // In Next.js app router, params is a Promise and must be awaited
  const { id: postId } = await params;

  const currentUser = await getCurrentUser();
  if (!postId) {
    notFound();
  }

  // Fetch post directly from Firestore
  const currentPost  = await fetchPostById(postId);

  if (!currentPost) {
    notFound();
  }

  return <PostDetailClient postId={postId} currentUser={currentUser} currentPost={currentPost} />;
}