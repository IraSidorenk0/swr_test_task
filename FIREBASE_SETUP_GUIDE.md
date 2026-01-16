# Firebase Setup Guide (Client SDK + Firebase Admin)

This project now uses **both** the Firebase client SDK (in the browser) and the **Firebase Admin SDK** (on the server) for authentication and Firestore access.

Use this guide to:

1. Configure your Firebase project and service account.
2. Set up the Admin SDK used in `firebase/firebase-admin.ts`.
3. Understand how session cookies and authentication work in this app.

---

## 1. Create / Configure the Firebase Project

1. Go to: https://console.firebase.google.com
2. Select or create the project: `my-project-1516289182804` (or your own project).
3. Make sure **Firestore Database** and **Authentication** are enabled.
4. In **Authentication → Sign-in method**, enable at least **Email/Password**.

---

## 2. Client SDK Configuration (`firebase/firebase.ts`)

The client SDK is used in the browser for things like `signInWithEmailAndPassword` and Firestore reads/writes.

In `firebase/firebase.ts` you should have something like:

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: '... ',
  authDomain: '... ',
  projectId: '... ',
  // etc.
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
```

Make sure these values match your project’s **Web app** configuration in the Firebase console.

---

## 3. Firebase Admin SDK Setup (`firebase/firebase-admin.ts`)

The Admin SDK runs **only on the server** (API routes, server actions, NextAuth). It uses a **service account key**.

### 3.1 Download service account JSON

1. In Firebase Console, go to **Project settings → Service accounts**.
2. Click **Generate new private key** for the Firebase Admin SDK.
3. Save the JSON file as:

   - `firebase/my-project-1516289182804-firebase-adminsdk-38lo1-8bc37c163a.json`
   
   or update the path in `firebase/firebase-admin.ts` to match your actual filename.

### 3.2 Ensure Admin initialization matches your project

In `firebase/firebase-admin.ts` you should have (simplified):

```ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = require('./my-project-1516289182804-firebase-adminsdk-38lo1-8bc37c163a.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://my-project-1516289182804-default-rtdb.firebaseio.com',
    projectId: 'my-project-1516289182804',
  });
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
```

If you changed the project ID or database URL, update them here as well.

---

## 4. How Authentication Works (Session Cookies)

The app uses a **session cookie** set by the server after sign-in. Key pieces:

- `firebase/actions.ts` (or `app/auth/actions.ts`) signs the user in and creates a session cookie using `adminAuth.createSessionCookie`.
- The cookie is stored as `session` via `next/headers` `cookies()` API.
- `firebase/auth.ts` and other server code read and verify this cookie with `getAuth().verifySessionCookie(...)`.

### 4.1 Sign-in flow (example)

1. Client calls a server action and sends `email` and `password`.
2. Server uses the **client SDK** (`signInWithEmailAndPassword`) or Admin SDK to authenticate.
3. Server calls `adminAuth.createSessionCookie(idToken, { expiresIn })`.
4. Server sets the `session` cookie (HTTP-only, secure in production).
5. Subsequent server requests use `adminAuth.verifySessionCookie(sessionCookie, true)` to get the Firebase user.

If you see errors here, check:

- The service account JSON is present and readable.
- The project ID in the service account matches your Firebase project.
- `NEXTAUTH_SECRET` (and any other required env vars) are set correctly.

---

## 5. Firestore Security Rules (Recommended Dev Setup)

Even with Firebase Admin, Firestore security rules still apply to **client SDK** access. For local development you can use permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Development only
    }
  }
}
```

For production, tighten the rules to require authentication, for example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }

    match /comments/{commentId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

Publish the rules in **Firestore Database → Rules**.

---

## 6. Troubleshooting

- **Admin SDK initialization errors**  
  Check that the service account file path is correct and that its contents match your project.

- **`verifySessionCookie` or `createSessionCookie` errors**  
  Confirm that the ID token or custom token is created from the same project as the Admin SDK.

- **Client SDK permission / 400 errors**  
  Re-check Firestore rules and that the client is using the correct project ID and API key.

- **NextAuth issues**  
  Make sure `NEXTAUTH_SECRET` is set and the Firestore adapter is configured with the same service account.

