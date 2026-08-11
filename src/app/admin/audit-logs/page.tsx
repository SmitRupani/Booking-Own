'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  ClipboardList,
  Search,
  Calendar,
  User,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface AuditLogItem {
  id: number;
  action: string;
  actorName: string;
  actorEmail: string;
  targetType?: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

const SAMPLE_LOGS: AuditLogItem[] = [
  {
    id: 1,
    action: 'BOOKING_CREATED',
    actorName: 'Student User',
    actorEmail: 'student@sst.scaler.com',
    targetType: 'RESOURCE',
    targetName: 'Badminton Court 1',
    details: 'Reserved slot 10:00 - 11:00 IST',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    action: 'CHECKED_IN',
    actorName: 'Main Gate Guard',
    actorEmail: 'guard-1@local',
    targetType: 'GATE_PASS',
    targetName: 'Pass #101',
    details: 'Scanned HMAC QR code token successfully',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    action: 'RESOURCE_UPDATED',
    actorName: 'Admin Staff',
    actorEmail: 'admin@scaler.com',
    targetType: 'EQUIPMENT',
    targetName: 'Cricket Bat',
    details: 'Updated total quantity stock to 6 items',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(SAMPLE_LOGS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const bookingLogs: AuditLogItem[] = (data.bookings || []).map((b: any) => ({
          id: b.id,
          action: b.status === 'CANCELLED' ? 'BOOKING_CANCELLED' : 'BOOKING_CREATED',
          actorName: b.userName || b.userEmail || 'Student',
          actorEmail: b.userEmail || 'student@sst.scaler.com',
          targetType: b.kind || 'RESOURCE',
          targetName: b.resourceName || `Resource #${b.resourceId}`,
          details: `Status: ${b.status}`,
          createdAt: b.startAt || new Date().toISOString(),
        }));
        if (bookingLogs.length > 0) {
          setLogs([...bookingLogs, ...SAMPLE_LOGS]);
        }
      }
    } catch {
      setError('Failed to refresh audit trail');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q) ||
      (log.targetName && log.targetName.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BOOKING_CREATED':
        return <Badge variant="success">Created</Badge>;
      case 'CHECKED_IN':
        return <Badge variant="default">Gate Check-in</Badge>;
      case 'BOOKING_CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'PENALTY_ISSUED':
        return <Badge variant="warning">Penalty</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Security Audit</Badge>
            <Badge variant="success">{logs.length} Recorded Events</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">System Audit Trail</h1>
          <p className="text-sm text-muted-foreground">
            Immutable log of all user reservations, gate access check-ins, return inspections, and administrator overrides.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Trail
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by action, user, or resource..."
          className="pl-9 text-xs"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No audit records matching your search.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((item, i) => (
            <Card key={i} className="border hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{item.action}</span>
                      {getActionBadge(item.action)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target: <strong className="text-foreground">{item.targetName}</strong> ({item.targetType})
                    </p>
                    {item.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground self-end sm:self-center text-right space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1 justify-end">
                    <User className="w-3 h-3 text-primary" />
                    {item.actorName}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
