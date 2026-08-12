'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPageClient() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useSignIn();

  const handleAdminSignIn = async () => {
    if (!signIn) return;
    setLoading(true);
    setError('');
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/admin/dashboard',
      });
    } catch (err) {
      console.error('Admin Sign in error:', err);
      setError('Failed to initiate Google sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Smart CAPTCHA container required by Clerk */}
      <div id="clerk-captcha" className="hidden" />

      <Card className="w-full max-w-md border shadow-2xl">
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs font-semibold border border-primary/20">
              <ShieldCheck className="h-4 w-4" />
              Administrative Console
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Admin Portal</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sign in with your Scaler administrator Google account (@scaler.com)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pb-8">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleAdminSignIn}
            disabled={loading}
            className="w-full h-12 gap-2 text-sm font-semibold cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Connecting to Google SSO...' : 'Sign In with Google (@scaler.com)'}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Access is restricted to authorized faculty and operations administrators.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
