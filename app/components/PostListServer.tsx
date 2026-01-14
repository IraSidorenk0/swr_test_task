import { Post } from '../types';
import PostsClient from './PostsClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../app/config/auth';

interface PostListServerProps {
  posts: Post[];
  initialLikedPostIds: string[];
}

export default async function PostListServer({
  posts,
  initialLikedPostIds,
}: PostListServerProps) {
  // Get the current user's session on the server
  const session = await getServerSession(authOptions);
  
  // Map the session to the expected user format
  const currentUser = session?.user ? {
    uid: session.user.id || '',
    name: session.user.name || undefined,
    email: session.user.email || undefined,
    image: session.user.image || undefined,
  } : null;

  return (
    <PostsClient
      posts={posts}
      initialLikedPostIds={initialLikedPostIds}
      initialUser={currentUser}
    />
  );
}
