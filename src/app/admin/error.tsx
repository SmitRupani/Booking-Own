'use client';

import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isPermissionError =
    error.message?.toLowerCase().includes('permission') ||
    error.message?.toLowerCase().includes('authorized') ||
    error.message?.toLowerCase().includes('insufficient');

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border shadow-2xl text-center">
        <CardHeader className="space-y-3 pt-8">
          <div className="mx-auto p-3.5 rounded-2xl bg-destructive/10 text-destructive w-fit">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isPermissionError ? 'Access Restricted' : 'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isPermissionError
              ? 'You do not have administrative privileges to access this area. If you believe this is an error, please ensure your email is added to ADMIN_EMAILS.'
              : error.message || 'An unexpected error occurred while loading this page.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-8">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reset()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </Button>
            <Link href="/user/dashboard">
              <Button size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
                <ArrowLeft className="w-3.5 h-3.5" />
                Go to Student Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
