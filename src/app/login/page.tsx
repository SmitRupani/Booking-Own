import { redirect } from 'next/navigation';
import { resolveLandingPath } from '@/lib/auth/landing';
import LoginPageClient from './LoginPageClient';

export default async function LoginPage() {
  const destination = await resolveLandingPath();

  if (destination && !destination.startsWith('/login')) {
    redirect(destination);
  }

  return <LoginPageClient />;
}
