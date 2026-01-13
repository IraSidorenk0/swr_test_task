import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '../firebase/firebase-admin';
import { cookies } from 'next/headers';
import { AppUser } from '../app/types';
// Initialize Firebase Admin if not already initialized
try {
  initializeFirebaseAdmin();
} catch (error) {
  console.error('Firebase admin initialization error', error);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return null; // No session cookie means user is not logged in
    }

    // Verify the session cookie and get user data
    const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
    const userRecord = await getAuth().getUser(decodedToken.uid);
    
    // Return a clean user object that matches AppUser type
    const appUser: AppUser = {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified || false,
      // Custom claims are not included in AppUser type
    };
    
    return appUser;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}
