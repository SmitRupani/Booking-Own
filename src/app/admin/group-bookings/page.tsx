'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Users,
  Calendar,
  Clock,
  User,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface GroupBookingItem {
  id: number;
  resourceName?: string;
  userName?: string;
  userEmail?: string;
  startAt: string;
  endAt: string;
  status: string;
}

export default function AdminGroupBookingsPage() {
  const [groups, setGroups] = useState<GroupBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const groupList = (data.bookings || []).filter(
          (b: any) => b.isGroupBooking
        );
        setGroups(groupList);
      }
    } catch {
      setError('Failed to load group reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Team Reservations</Badge>
            <Badge variant="success">{groups.length} Group Bookings</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Group Booking Rosters</h1>
          <p className="text-sm text-muted-foreground">
            Track multi-player turf sports matches, team organizers, and player attendance confirmations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchGroups}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading group bookings...
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No group reservations currently registered.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const start = new Date(group.startAt);
            const end = new Date(group.endAt);

            return (
              <Card key={group.id} className="border hover:border-primary/40 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {group.resourceName || `Group Booking #${group.id}`}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          Organizer: {group.userName || group.userEmail}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={group.status === 'CONFIRMED' ? 'success' : 'secondary'}>
                      {group.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
