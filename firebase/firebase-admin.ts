import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Initialize Firebase Admin with service account
const serviceAccount = require('./my-project-1516289182804-firebase-adminsdk-38lo1-8bc37c163a.json');

// Initialize Firebase Admin SDK if it hasn't been initialized already
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://my-project-1516289182804-default-rtdb.firebaseio.com',
    projectId: 'my-project-1516289182804'
  });
}

export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
  }
  return getAuth();
}

export const adminDb = getFirestore();
export const db = adminDb;
export const auth = getAuth();
export const adminAuth = getAuth();
