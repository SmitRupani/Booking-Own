'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface IssuedBooking {
  id: number;
  userName?: string;
  userEmail?: string;
  resourceName?: string;
  items?: { name: string; qty: number }[];
  startAt: string;
  endAt: string;
  status: string;
}

export default function GuardReturnsPage() {
  const [issuedList, setIssuedList] = useState<IssuedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<IssuedBooking | null>(null);
  const [condition, setCondition] = useState<'GOOD' | 'DAMAGED' | 'LOST'>('GOOD');
  const [damageNotes, setDamageNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIssued = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const activeLoans = (data.bookings || []).filter(
          (b: any) => ['CHECKED_IN', 'CONFIRMED'].includes(b.status) && (b.kind === 'EQUIPMENT' || b.items?.length)
        );
        setIssuedList(activeLoans);
      }
    } catch {
      setError('Failed to load active equipment loans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssued();
  }, [fetchIssued]);

  const handleProcessReturn = async () => {
    if (!selectedBooking) return;
    if (condition === 'DAMAGED' && !damageNotes.trim()) {
      alert('Please enter damage assessment notes');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/scanner/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          condition: condition === 'GOOD' ? 'good' : 'damaged',
          damageNotes: damageNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to process return');
        setSubmitting(false);
        return;
      }

      setSelectedBooking(null);
      setDamageNotes('');
      setCondition('GOOD');
      fetchIssued();
    } catch {
      setError('An error occurred during return processing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Gear Return Desk</Badge>
            <Badge variant="success">{issuedList.length} Active Loans</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Equipment Returns Station</h1>
          <p className="text-sm text-muted-foreground">
            Inspect returned sports & lab equipment items, assess condition, and release student deposits.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIssued}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading issued gear...
        </div>
      ) : issuedList.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No equipment currently checked out by students.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {issuedList.map((booking) => {
            const end = new Date(booking.endAt);
            const isLate = new Date() > end;

            return (
              <Card
                key={booking.id}
                className={`border transition-all ${
                  isLate ? 'border-destructive/40 bg-destructive/5' : 'hover:border-primary/40'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Package className="w-5 h-5" />
                    </div>
                    <Badge variant={isLate ? 'destructive' : 'secondary'}>
                      {isLate ? 'Overdue Return' : 'Issued'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">
                    {booking.resourceName || `Booking #${booking.id}`}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    {booking.userName || booking.userEmail}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {booking.items && booking.items.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-muted-foreground">Items:</p>
                      <ul className="list-disc list-inside">
                        {booking.items.map((it, i) => (
                          <li key={i}>
                            {it.name} (x{it.qty})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Due by: {end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    Process Return
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Return Inspection Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Inspect Returned Gear"
      >
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">{selectedBooking?.resourceName}</p>
            <p className="text-xs text-muted-foreground">
              Borrower: {selectedBooking?.userName || selectedBooking?.userEmail}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Equipment Condition:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={condition === 'GOOD' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCondition('GOOD')}
              >
                Good
              </Button>
              <Button
                type="button"
                variant={condition === 'DAMAGED' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setCondition('DAMAGED')}
              >
                Damaged
              </Button>
              <Button
                type="button"
                variant={condition === 'LOST' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setCondition('LOST')}
              >
                Lost
              </Button>
            </div>
          </div>

          {condition !== 'GOOD' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-destructive">
                Damage / Defect Notes:
              </label>
              <Input
                type="text"
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Describe missing or damaged parts..."
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => setSelectedBooking(null)}
            >
              Cancel
            </Button>
            <Button
              className="w-1/2"
              disabled={submitting}
              onClick={handleProcessReturn}
            >
              {submitting ? 'Processing...' : 'Complete Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
