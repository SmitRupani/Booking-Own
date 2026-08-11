'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  QrCode,
  Calendar,
  Clock,
  XCircle,
  RefreshCw,
  Package,
} from 'lucide-react';
import QRCode from 'qrcode';

interface Booking {
  id: number;
  resourceId: number;
  resourceName?: string;
  resourceCategory?: string;
  kind: 'FACILITY' | 'ROOM' | 'EQUIPMENT' | 'LIBRARY';
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  qrCode?: string;
  items?: { name: string; qty: number }[];
  isGroupBooking?: boolean;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [error, setError] = useState('');
  const [qrModal, setQrModal] = useState<{
    open: boolean;
    qrUrl?: string;
    booking?: Booking;
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
    try {
      const token = booking.qrCode || `SST-QR-${booking.id}-${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrModal({ open: true, qrUrl: qrDataUrl, booking });
    } catch {
      setError('Failed to render QR Code');
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
            Manage your room and court bookings, view gate pass QR codes, and review loan histories.
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyBookings.length})</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse">
              Loading your bookings...
            </div>
          ) : currentList.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              <p className="text-sm">No reservations found in this view.</p>
            </Card>
          ) : (
            currentList.map((booking) => {
              const start = new Date(booking.startAt);
              const end = new Date(booking.endAt);

              return (
                <Card key={booking.id} className="border hover:border-primary/40 transition-all">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {booking.kind}
                        </span>
                        {getStatusBadge(booking.status)}
                        {booking.isGroupBooking && (
                          <Badge variant="secondary">Group Booking</Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-bold">
                        {booking.resourceName || `Resource #${booking.resourceId}`}
                      </h3>

                      {booking.items && booking.items.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          Items: {booking.items.map((it) => `${it.name} (x${it.qty})`).join(', ')}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {start.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
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
                            Pass QR
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
              Valid for check-in during your reserved slot.
            </p>
          </div>
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
