'use client';

import { useParams } from 'next/navigation';
import PostDetail from '../../components/PostDetail';

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;

  if (!postId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ошибка</h2>
          <p className="text-gray-600">ID поста не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PostDetail postId={postId} />
    </div>
  );
}

