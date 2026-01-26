'use server';

import { notFound, redirect } from 'next/navigation';
import { db } from '../../../../firebase/firebase-admin';
import { Post, SerializedPost } from '../../../types';
import { getCurrentUser } from '@/firebase/auth';
import EditPostClient from './EditPostClient';

type Props = {
  params: {
    id: string;
  };
};

export default async function EditPostPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  
  const postId = params.id;

  if (!postId) {
    notFound();
  }

  // Redirect to auth if not logged in
  if (!currentUser) {
    redirect(`/auth?redirect=${encodeURIComponent(`/posts/${postId}/edit`)}`);
  }

  // Fetch post data using firebase-admin
  const postRef = db.collection('posts').doc(postId);
  const postDoc = await postRef.get();
  
  // Handle case where post was not found
  if (!postDoc.exists) {
    notFound();
  }
  
  const postData = postDoc.data() as Post;
  const post = {
    id: postDoc.id,
    title: postData.title,
    content: postData.content,
    tags: Array.isArray(postData.tags) ? postData.tags : [],
    likes: typeof postData.likes === 'number' ? postData.likes : 0,
    authorId: postData.authorId,
    authorName: postData.authorName,
    createdAt: postData.createdAt ? postData.createdAt : postData.createdAt,
    updatedAt: postData.updatedAt ? postData.updatedAt : postData.updatedAt,
  } as Post;
  
  // Check if the current user is the author of the post
  if (post.authorId !== currentUser.uid) {
    // Redirect to the post view if the user is not the author
    redirect(`/posts/${postId}`);
  }

  // Ensure the post data is in the correct format for SerializedPost
  const serializedPost: SerializedPost = {
    ...post,
    id: postId,
    title: post.title || '',
    content: post.content || '',
    tags: post.tags || [],
    likes: post.likes || 0,
    authorId: post.authorId || '',
    authorName: post.authorName || 'Anonymous',
    createdAt: post.createdAt ? (typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toString()) : new Date().toISOString(),
    updatedAt: post.updatedAt ? (typeof post.updatedAt === 'string' ? post.updatedAt : post.updatedAt.toString()) : new Date().toISOString(),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Post</h1>
      <EditPostClient post={serializedPost} currentUser={currentUser} postId={postId} />
    </div>
  );
}
