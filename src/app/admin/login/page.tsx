import { redirect } from 'next/navigation';
import { resolveLandingPath } from '@/lib/auth/landing';
import AdminLoginPageClient from './AdminLoginPageClient';

export default async function AdminLoginPage() {
  const destination = await resolveLandingPath();

  if (destination && destination.startsWith('/admin')) {
    redirect(destination);
  }

  return <AdminLoginPageClient />;
}
