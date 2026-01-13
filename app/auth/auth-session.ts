// auth-session.ts
import { getServerSession as nextGetServerSession } from 'next-auth';
import { authOptions } from '../auth';

export async function getServerSession() {
  const session = await nextGetServerSession(authOptions);
  return session;
}