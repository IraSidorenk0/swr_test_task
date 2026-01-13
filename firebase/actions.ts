'use server';

import { adminAuth } from './firebase-admin';
import { cookies } from 'next/headers';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth as clientAuth } from './firebase';

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);
    return { uid: decodedClaims.uid, email: decodedClaims.email };
  } catch (error) {
    return null;
  }
}

export async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // Sign in with email and password using the client SDK
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Create a session cookie using the ID token
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 5 * 1000 // 5 days
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { 
      success: false, 
      error: 'Invalid email or password' 
    };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}