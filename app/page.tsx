'use server';
import PostList from './components/PostList';
import { getPosts } from '../store/slices/postsActions';
import { getCurrentUser } from '../firebase/auth';

export default async function Home() {
  const authorFilter = '';
  const tagFilter = '';
  const posts = await getPosts(authorFilter, tagFilter);
  const currentUser = await getCurrentUser();
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
      <PostList posts={posts} currentUser={currentUser}/>
    </div>
  );
}
