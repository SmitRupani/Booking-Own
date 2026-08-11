'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface PendingBooking {
  id: number;
  userName?: string;
  userEmail?: string;
  resourceName?: string;
  borrowReason?: string;
  items?: { name: string; qty: number }[];
  startAt: string;
  endAt: string;
}

export default function AdminLabApprovalsPage() {
  const [pendingList, setPendingList] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectingBooking, setRejectingBooking] = useState<PendingBooking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const pending = (data.bookings || []).filter(
          (b: any) => b.status === 'PENDING'
        );
        setPendingList(pending);
      }
    } catch {
      setError('Failed to load pending approval requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (bookingId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status: 'CONFIRMED' }),
      });
      if (res.ok) {
        fetchPending();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to approve booking');
      }
    } catch {
      setError('An error occurred approving booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingBooking) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectingBooking.id,
          status: 'CANCELLED',
          rejectReason: rejectReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        setRejectingBooking(null);
        setRejectReason('');
        fetchPending();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reject booking');
      }
    } catch {
      setError('An error occurred rejecting booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Faculty Review</Badge>
            <Badge variant={pendingList.length > 0 ? 'warning' : 'success'}>
              {pendingList.length} Pending
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Lab Equipment Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and grant permission for high-value lab apparatus, multi-day gear loans, and specialized kits.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPending}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading approval requests...
        </div>
      ) : pendingList.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No pending equipment approvals awaiting review.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingList.map((booking) => {
            const start = new Date(booking.startAt);
            const end = new Date(booking.endAt);

            return (
              <Card key={booking.id} className="border hover:border-primary/40 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                        Pending Approval
                      </span>
                      <CardTitle className="text-lg mt-1">
                        {booking.resourceName || `Booking #${booking.id}`}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Requested by: {booking.userName || booking.userEmail}
                      </CardDescription>
                    </div>
                    <Badge variant="warning">Awaiting Review</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {booking.borrowReason && (
                    <div className="p-3 rounded-lg border bg-card/60 text-xs">
                      <p className="font-semibold text-muted-foreground">Purpose / Coursework:</p>
                      <p className="mt-0.5 text-foreground">{booking.borrowReason}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Duration: {start.toLocaleDateString('en-IN')} – {end.toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setRejectingBooking(booking)}
                      className="gap-1 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleApprove(booking.id)}
                      className="gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Loan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        title="Reject Equipment Loan"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to reject the loan for{' '}
            <strong>{rejectingBooking?.resourceName}</strong>?
          </p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Reason for Rejection (Optional):
            </label>
            <Input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Apparatus reserved for lab exams"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => setRejectingBooking(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-1/2"
              disabled={submitting}
              onClick={handleReject}
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
