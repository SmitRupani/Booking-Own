'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { Users, CheckCircle, XCircle, Calendar, Clock, Sparkles } from 'lucide-react';

interface Invitation {
  id: number;
  bookingId: number;
  resourceName?: string;
  organizerName?: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export default function GroupInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // In a real environment, fetches from /api/group-bookings/invitations
    // For now we fetch user bookings and filter group invitations
    const loadInvites = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          const groupBookings = (data.bookings || []).filter(
            (b: any) => b.isGroupBooking
          );
          setInvitations(
            groupBookings.map((b: any) => ({
              id: b.id,
              bookingId: b.id,
              resourceName: b.resourceName || `Court Booking #${b.id}`,
              organizerName: b.userName || 'Team Organizer',
              startAt: b.startAt,
              endAt: b.endAt,
              status: 'ACCEPTED',
            }))
          );
        }
      } catch {
        setError('Failed to load group invitations');
      } finally {
        setLoading(false);
      }
    };
    loadInvites();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Team Reservations</Badge>
          <Badge variant="success">{invitations.length} Groups</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Group Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Review and respond to sports match invitations and study group sessions sent by your peers.
        </p>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">You have no pending group invitations.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {invitations.map((inv) => {
            const start = new Date(inv.startAt);
            const end = new Date(inv.endAt);

            return (
              <Card key={inv.id} className="border hover:border-primary/40 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <Badge variant={inv.status === 'ACCEPTED' ? 'success' : 'warning'}>
                      {inv.status === 'ACCEPTED' ? 'Joined' : 'Invitation'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{inv.resourceName}</CardTitle>
                  <CardDescription className="text-xs">
                    Organized by {inv.organizerName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
