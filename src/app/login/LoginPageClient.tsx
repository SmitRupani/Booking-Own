'use client';

import { useSignIn } from '@clerk/nextjs';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Sparkles, Shield, ArrowLeft, User, Lock, LogIn } from 'lucide-react';

const FloatingParticle = ({
  delay,
  size,
  left,
  duration,
}: {
  delay: number;
  size: number;
  left: string;
  duration: number;
}) => (
  <div
    className="absolute rounded-full bg-blue-500/20 animate-pulse"
    style={{
      width: size,
      height: size,
      left: left,
      bottom: '-20px',
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  />
);

function LoginContent() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGuardLogin, setIsGuardLogin] = useState(false);
  const [guardAccessValid, setGuardAccessValid] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const accessKey = searchParams.get('gk');

  useEffect(() => {
    if (!accessKey) {
      setGuardAccessValid(false);
      setIsGuardLogin(false);
      return;
    }

    const abortController = new AbortController();
    let isCancelled = false;

    const validateKey = async () => {
      setValidatingKey(true);
      try {
        const res = await fetch('/api/auth/validate-guard-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessKey }),
          signal: abortController.signal,
        });

        if (isCancelled) return;
        const data = await res.json();

        if (data.valid) {
          setGuardAccessValid(true);
          setIsGuardLogin(true);
        } else {
          setGuardAccessValid(false);
          setIsGuardLogin(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!isCancelled) {
          setGuardAccessValid(false);
          setIsGuardLogin(false);
        }
      } finally {
        if (!isCancelled) {
          setValidatingKey(false);
        }
      }
    };

    validateKey();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [accessKey]);

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch {
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGuardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const accessKey = searchParams.get('gk');

      const response = await fetch('/api/auth/guard-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, accessKey }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/guard/scanner');
      } else {
        setError(data.error || 'Invalid credentials or access denied');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden text-slate-100">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        {mounted && (
          <>
            <FloatingParticle delay={0} size={6} left="10%" duration={8} />
            <FloatingParticle delay={2} size={4} left="25%" duration={10} />
            <FloatingParticle delay={4} size={8} left="40%" duration={7} />
            <FloatingParticle delay={1} size={5} left="60%" duration={9} />
            <FloatingParticle delay={3} size={6} left="75%" duration={11} />
            <FloatingParticle delay={5} size={4} left="90%" duration={8} />
          </>
        )}
      </div>

      {/* Login Card */}
      <Card className="relative w-full max-w-md bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl z-10">
        {validatingKey && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto flex items-center justify-center">
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">SST Booking</span>
              <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-100">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-sm text-slate-400 flex items-center justify-center gap-2">
              {isGuardLogin ? (
                <>
                  <Shield className="h-4 w-4 text-purple-400" />
                  Guard Portal
                </>
              ) : (
                <>
                  <User className="h-4 w-4 text-blue-400" />
                  Student & Staff Portal
                </>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 space-y-6">
          {!isGuardLogin ? (
            <div className="space-y-6">
              <p className="text-center text-xs text-slate-400">
                Sign in to reserve sports facilities, study rooms, and equipment.
              </p>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>{loading ? 'Signing in...' : 'Continue with Scaler SSO'}</span>
              </button>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-lg">🏟️</span>
                  <span className="text-[11px] text-slate-300 font-medium">Facilities</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-lg">🎾</span>
                  <span className="text-[11px] text-slate-300 font-medium">Equipment</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-lg">🚪</span>
                  <span className="text-[11px] text-slate-300 font-medium">Rooms</span>
                </div>
              </div>

              {guardAccessValid && (
                <Button
                  variant="ghost"
                  onClick={() => setIsGuardLogin(true)}
                  className="w-full text-slate-400 hover:text-white"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Guard Login
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleGuardLogin} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                  <span>❌</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="guard-1"
                  required
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-400" />
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? 'Logging in...' : 'Sign In as Guard'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsGuardLogin(false);
                  setError('');
                }}
                className="w-full text-slate-400 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Student Login
              </Button>
            </form>
          )}

          <p className="text-center text-[10px] text-slate-500 pt-2">
            School of Science and Technology · Scaler
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
