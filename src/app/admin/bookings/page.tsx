'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Search,
  Calendar,
  Clock,
  User,
  XCircle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Package,
} from 'lucide-react';

interface AdminBooking {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  resourceId: number;
  resourceName?: string;
  resourceCategory?: string;
  kind: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  startAt: string;
  endAt: string;
  items?: { name: string; qty: number }[];
  isGroupBooking?: boolean;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Cancel / Override Modal
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    booking?: AdminBooking;
    reason?: string;
  }>({ open: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      setError('Failed to load global bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((b) => {
    // 1. Status filter
    if (filter === 'active' && !['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(b.status)) {
      return false;
    }
    if (filter === 'completed' && b.status !== 'COMPLETED') {
      return false;
    }
    if (filter === 'cancelled' && b.status !== 'CANCELLED') {
      return false;
    }

    // 2. Search query filter
    const q = search.toLowerCase();
    const matchesName = (b.userName || '').toLowerCase().includes(q);
    const matchesEmail = (b.userEmail || '').toLowerCase().includes(q);
    const matchesResource = (b.resourceName || '').toLowerCase().includes(q);
    return matchesName || matchesEmail || matchesResource;
  });

  const handleForceCancel = async () => {
    if (!cancelModal.booking) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cancelModal.booking.id,
          status: 'CANCELLED',
          cancelReason: cancelModal.reason || 'Admin override',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to cancel booking');
        return;
      }

      setCancelModal({ open: false });
      fetchBookings();
    } catch {
      setError('An error occurred during administrative cancellation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'CHECKED_IN':
        return <Badge variant="default">Checked In</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Completed</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Administrative Console</Badge>
            <Badge variant="success">{bookings.length} Total Records</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Master Booking Registry</h1>
          <p className="text-sm text-muted-foreground">
            Search, monitor, and manage campus space reservations and gear loans across all students.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBookings}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, or space..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading bookings registry...
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No reservations matching your filter criteria.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const start = new Date(b.startAt);
            const end = new Date(b.endAt);

            return (
              <Card key={b.id} className="border hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {b.kind || 'BOOKING'}
                      </span>
                      {getStatusBadge(b.status)}
                      {b.isGroupBooking && <Badge variant="secondary">Group</Badge>}
                    </div>

                    <h3 className="text-base font-bold">
                      {b.resourceName || `Resource #${b.resourceId}`}
                    </h3>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Borrower: {b.userName || b.userEmail || `User #${b.userId}`}
                    </p>

                    {b.items && b.items.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        Items: {b.items.map((it) => `${it.name} (x${it.qty})`).join(', ')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {start.toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {start.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {end.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(b.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setCancelModal({
                            open: true,
                            booking: b,
                            reason: '',
                          })
                        }
                        className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Force Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Force Cancel Modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false })}
        title="Admin Override: Force Cancel"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to cancel the booking for{' '}
            <strong>{cancelModal.booking?.resourceName}</strong> booked by{' '}
            <strong>{cancelModal.booking?.userName || cancelModal.booking?.userEmail}</strong>?
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Reason for Cancellation:
            </label>
            <Input
              type="text"
              value={cancelModal.reason || ''}
              onChange={(e) =>
                setCancelModal({ ...cancelModal, reason: e.target.value })
              }
              placeholder="e.g. Unscheduled campus maintenance, emergency closure"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => setCancelModal({ open: false })}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              className="w-1/2"
              disabled={submitting}
              onClick={handleForceCancel}
            >
              {submitting ? 'Cancelling...' : 'Confirm Force Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
