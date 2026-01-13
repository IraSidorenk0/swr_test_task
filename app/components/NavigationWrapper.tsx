import { getServerSession } from 'next-auth';
import { db } from '@/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Navigation from './Navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function NavigationWrapper() {
  const session = await getServerSession(authOptions);
  
  // Transform the session user to match the expected User type
  const currentUser = session?.user ? {
    uid: session.user.id || '',
    email: session.user.email || null,
    displayName: session.user.name || null,
    photoURL: session.user.image || null,
    emailVerified: true // Assuming email is verified if we have a session
  } : null;
  
  // Fetch comments count for the user if logged in
  let commentsCount = 0;
  if (session?.user?.email) {
    try {
      const commentsQuery = query(
        collection(db, 'comments'),
        where('authorId', '==', session.user.email)
      );
      const querySnapshot = await getDocs(commentsQuery);
      commentsCount = querySnapshot.size;
    } catch (error) {
      console.error('Error fetching comments count:', error);
    }
  }

  return (
    <Navigation 
      currentUser={currentUser} 
      commentsCount={commentsCount}
    />
  );
}
