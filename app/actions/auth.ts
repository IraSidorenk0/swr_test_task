'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

export async function signIn(prevState: string | undefined, formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    if (result?.error) {
      return 'Неверный email или пароль';
    }
    
    return 'Success';
  } catch (error) {
    console.error('Sign in error:', error);
    return 'Произошла ошибка при входе';
  }
}

export async function signOut() {
  try {
    await nextAuthSignOut({ redirect: false });
    redirect('/auth');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
