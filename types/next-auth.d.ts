<<<<<<< HEAD
import NextAuth from 'next-auth';
=======
import 'next-auth';
>>>>>>> feature/ServerMethods

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
<<<<<<< HEAD
=======

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}
>>>>>>> feature/ServerMethods
