import NextAuth, { type NextAuthOptions, type SessionStrategy } from 'next-auth';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import { cert } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import serviceAccount from '@/firebase/my-project-1516289182804-firebase-adminsdk-38lo1-8bc37c163a.json';

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const sa = serviceAccount as ServiceAccountJson;

const firebaseServiceAccount: ServiceAccount = {
  projectId: sa.project_id,
  clientEmail: sa.client_email,
  privateKey: sa.private_key,
};

export const authOptions: NextAuthOptions = {
  providers: [
    // Configure your authentication providers here
    // For example, you can add email/password, Google, etc.
  ],
  adapter: FirestoreAdapter({
    credential: cert(firebaseServiceAccount),
  }),
  // Add any additional NextAuth configuration here
  session: {
    strategy: 'jwt' as SessionStrategy,
  },
  secret: process.env.NEXTAUTH_SECRET, // Make sure to set this in your .env file
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub || '';
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
