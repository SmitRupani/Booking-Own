'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ApprovalResultContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    action?: string;
    error?: string;
    status?: string;
    bookingId?: string;
  } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success') === 'true';
    const action = searchParams.get('action');
    const error = searchParams.get('error');
    const status = searchParams.get('status');
    const bookingId = searchParams.get('bookingId');

    setResult({
      success,
      action: action || undefined,
      error: error || undefined,
      status: status || undefined,
      bookingId: bookingId || undefined,
    });
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1b2a] to-[#05060b]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#0a1628] via-[#0d1b2a] to-[#05060b]">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-center text-white">Booking Approval Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && result.action === 'approve' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-400 mb-2">
                  Booking Approved Successfully
                </h2>
                <p className="text-slate-300">
                  The booking has been approved and confirmed.
                </p>
                {result.bookingId && (
                  <p className="text-sm text-slate-400 mt-2 font-mono">
                    Booking ID: {result.bookingId.slice(-8)}
                  </p>
                )}
              </div>
            </>
          )}

          {result?.success && result.action === 'reject' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-500 mb-2">
                  Booking Rejected
                </h2>
                <p className="text-slate-300">
                  The booking has been rejected and cancelled.
                </p>
                {result.bookingId && (
                  <p className="text-sm text-slate-400 mt-2 font-mono">
                    Booking ID: {result.bookingId.slice(-8)}
                  </p>
                )}
              </div>
            </>
          )}

          {result?.error === 'invalid_token' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-yellow-500/10 p-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-yellow-500 mb-2">
                  Invalid or Expired Link
                </h2>
                <p className="text-slate-300">
                  This approval link is invalid or has expired. Please use the admin dashboard to process this booking.
                </p>
              </div>
            </>
          )}

          {result?.error === 'already_processed' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-blue-500/10 p-4">
                  <AlertCircle className="h-12 w-12 text-blue-400" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-blue-400 mb-2">
                  Already Processed
                </h2>
                <p className="text-slate-300">
                  This booking has already been {result.status?.toLowerCase()}.
                </p>
              </div>
            </>
          )}

          {result?.error === 'booking_not_found' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-500 mb-2">
                  Booking Not Found
                </h2>
                <p className="text-slate-300">
                  The booking associated with this link could not be found.
                </p>
              </div>
            </>
          )}

          {result?.error === 'action_mismatch' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-yellow-500/10 p-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-yellow-500 mb-2">
                  Invalid Action
                </h2>
                <p className="text-slate-300">
                  The action you're trying to perform doesn't match this link.
                </p>
              </div>
            </>
          )}

          {result?.error === 'server_error' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-500 mb-2">
                  Server Error
                </h2>
                <p className="text-slate-300">
                  An error occurred while processing your request. Please try again later or use the admin dashboard.
                </p>
              </div>
            </>
          )}

          <div className="pt-4">
            <Link href="/admin/lab-approvals">
              <Button className="w-full border border-white/10 text-white hover:bg-white/5" variant="ghost">
                Go to Admin Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ApprovalResultPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1b2a] to-[#05060b]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    }>
      <ApprovalResultContent />
    </Suspense>
  );
}
