// auth.config.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { initializeFirebaseAdmin } from '@/firebase/firebase-admin';

export const authOptions: NextAuthOptions = {
  providers: [
    // Add your authentication providers here
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const admin = initializeFirebaseAdmin();
          const { getAuth } = await import('firebase-admin/auth');
          
          // Sign in with email/password using Firebase Admin SDK
          const userRecord = await getAuth().getUserByEmail(credentials.email);
          
          // Verify password (you'll need to implement this part)
          // This is a simplified example - in production, you should use Firebase Auth client SDK for sign-in
          // and only verify the ID token on the server
          
          return {
            id: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
          };
        } catch (error) {
          console.error('Error during authentication:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth', // Your custom sign-in page
    error: '/auth/error', // Error code passed in query string as ?error=
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};