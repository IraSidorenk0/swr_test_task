import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Initialize Firebase Admin with service account
const serviceAccount = require('./my-project-1516289182804-firebase-adminsdk-38lo1-8bc37c163a.json');

let adminApp: App;

// Initialize Firebase Admin SDK if it hasn't been initialized already
if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://my-project-1516289182804-default-rtdb.firebaseio.com',
    projectId: 'my-project-1516289182804'
  });
} else {
  adminApp = getApps()[0];
}

export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
  }
  return getAuth(adminApp);
}

export const adminDb = getFirestore(adminApp);
export const db = adminDb;
export const auth = getAuth(adminApp);
export const adminAuth = getAuth(adminApp);

/**
 * Checks if Firebase services are available
 * @returns Promise<boolean> - Resolves to true if Firebase is reachable, false otherwise
 */
export async function getConnectionStatus(): Promise<boolean> {
  try {
    // Try to get a document to check Firestore connection
    await adminDb.collection('_check_connection').doc('ping').get();
    
    // Try to verify a test token to check Auth connection
    await auth.verifyIdToken('dummy-token').catch(() => {
      // We expect this to fail, but it confirms the Auth service is reachable
    });
    
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    return false;
  }
}
export const app = adminApp;
