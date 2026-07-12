"use client";
import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Will fix later
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_dGVzdC1jbGVyay1rZXktZm9yLWJ1aWxkLXNhZmV0eS0wMC5jbGVyay5hY2NvdW50cy5kZXYk';

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}

export default AuthProvider;
