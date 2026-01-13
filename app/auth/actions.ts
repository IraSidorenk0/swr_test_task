'server';

import { adminAuth } from '../../firebase/firebase-admin';
import { cookies } from 'next/headers';

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

export async function signIn(email: string, password: string) {
  try {
    // In a real app, verify the password here
    const user = await adminAuth.getUserByEmail(email);
    
    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(
      await adminAuth.createCustomToken(user.uid), 
      { expiresIn: 60 * 60 * 24 * 5 * 1000 } // 5 days
    );

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
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'Invalid credentials' };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}
