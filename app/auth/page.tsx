'use server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from "../../firebase/auth";

import AuthPageComponent from '../components/AuthPageComponent';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const currentUser = await getCurrentUser();
  const redirectUrl = searchParams.redirect;

  // Redirect on the server side if user is already logged in
  if (currentUser) {
    const redirectTo = Array.isArray(redirectUrl) ? redirectUrl[0] : redirectUrl || '/';
    redirect(redirectTo);
  }

  return <AuthPageComponent currentUser={currentUser} />;
}
