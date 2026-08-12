'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Calendar as CalendarIcon,
  Clock,
  QrCode,
  XCircle,
  Copy,
  Check,
  Package,
} from 'lucide-react';

interface Booking {
  id: number;
  resourceId: number;
  resourceName?: string;
  kind?: string;
  items?: { name: string; qty: number }[];
  startAt: string;
  endAt: string;
  status: string;
  approval?: string;
  qrCode?: string;
}

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [copiedToken, setCopiedToken] = useState(false);

  // QR Modal State
  const [qrModal, setQrModal] = useState<{
    open: boolean;
    qrUrl?: string;
    token?: string;
    booking?: Booking;
    loading?: boolean;
  }>({ open: false });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      setError('Failed to load your reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const now = new Date();
  const activeBookings = bookings.filter((b) =>
    ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(b.status) && new Date(b.endAt) >= now
  );
  const historyBookings = bookings.filter(
    (b) => ['COMPLETED', 'CANCELLED'].includes(b.status) || new Date(b.endAt) < now
  );

  const handleShowQR = async (booking: Booking) => {
    setQrModal({ open: true, loading: true, booking });
    try {
      const res = await fetch(`/api/bookings/${booking.id}/qr`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setQrModal({
          open: true,
          qrUrl: data.qrImage,
          token: data.token,
          booking,
          loading: false,
        });
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate gate pass QR');
        setQrModal({ open: false });
      }
    } catch {
      setError('Failed to render QR Code');
      setQrModal({ open: false });
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status: 'CANCELLED' }),
      });
      if (res.ok) {
        fetchBookings();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to cancel booking');
      }
    } catch {
      setError('Error communicating with cancellation service.');
    }
  };

  const copyToken = () => {
    if (qrModal.token) {
      navigator.clipboard.writeText(qrModal.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'CHECKED_IN':
        return <Badge variant="default">Checked In</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Completed</Badge>;
    }
  };

  const currentList = tab === 'active' ? activeBookings : historyBookings;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">My Bookings</Badge>
            <Badge variant="success">{activeBookings.length} Active</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">My Reservations & Loans</h1>
          <p className="text-sm text-muted-foreground">
            Manage your facility slots, room bookings, and generate gate pass QR codes.
          </p>
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      <Tabs value={tab} onValueChange={(val) => setTab(val as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
          <TabsTrigger value="active">Active & Upcoming ({activeBookings.length})</TabsTrigger>
          <TabsTrigger value="history">Past History ({historyBookings.length})</TabsTrigger>
        </TabsList>

        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Loading your bookings...
            </div>
          ) : currentList.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              <p className="text-sm">
                {tab === 'active'
                  ? 'No active reservations found. Explore facilities to book your next slot!'
                  : 'No past booking records.'}
              </p>
            </Card>
          ) : (
            currentList.map((booking) => {
              const start = new Date(booking.startAt);
              const end = new Date(booking.endAt);

              return (
                <Card key={booking.id} className="border hover:border-primary/40 transition-all">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">
                          {booking.resourceName || `Booking #${booking.id}`}
                        </span>
                        {getStatusBadge(booking.status)}
                        {booking.kind && (
                          <Badge variant="secondary" className="text-xs uppercase">
                            {booking.kind}
                          </Badge>
                        )}
                      </div>

                      {booking.items && booking.items.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          Items: {booking.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                          {start.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
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
                      {tab === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowQR(booking)}
                            className="gap-1.5"
                          >
                            <QrCode className="w-4 h-4 text-primary" />
                            Gate Pass QR
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Tabs>

      {/* QR Code Pass Modal */}
      <Modal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false })}
        title="Gate Verification QR Pass"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          {qrModal.loading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Generating secure HMAC QR pass...
            </div>
          ) : (
            <>
              {qrModal.qrUrl && (
                <div className="p-4 bg-white rounded-2xl shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrModal.qrUrl}
                    alt="Booking Gate Pass QR Code"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              )}

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">
                  {qrModal.booking?.resourceName || `Booking #${qrModal.booking?.id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Present this QR code or manual token to security guard at the gate.
                </p>
              </div>

              {qrModal.token && (
                <div className="w-full bg-card/60 border rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="truncate">{qrModal.token}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToken}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          <Button
            className="w-full"
            variant="outline"
            onClick={() => setQrModal({ open: false })}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
