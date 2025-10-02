import PostList from './components/PostList';

export default function Home() {
  return (
    <div className="container-responsive py-8">
      <div className="text-center mb-12">
        <h1 className="text-responsive-xl font-bold text-gray-900 mb-4">
          Добро пожаловать в блог
        </h1>
        <p className="text-responsive-base text-gray-600 max-w-2xl mx-auto">
          Современный блог, созданный с использованием Next.js, Firebase и Redux. 
          Делитесь своими мыслями и идеями с сообществом.
        </p>
      </div>
      <PostList />
    </div>
  );
}
