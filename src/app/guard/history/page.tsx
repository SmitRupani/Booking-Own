'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Clock, User, Package, RefreshCw, CheckCircle2, QrCode } from 'lucide-react';

interface AuditScanItem {
  id: number;
  userName?: string;
  userEmail?: string;
  resourceName?: string;
  status: string;
  startAt: string;
  endAt: string;
}

export default function GuardHistoryPage() {
  const [history, setHistory] = useState<AuditScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.bookings || []);
      }
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Gate Logs</Badge>
            <Badge variant="success">Audit Trail</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Guard Activity & Scan History</h1>
          <p className="text-sm text-muted-foreground">
            Complete timeline of student gate check-ins, departures, and equipment return verifications.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Log
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading scan logs...
        </div>
      ) : history.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No gate scans recorded yet today.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const start = new Date(item.startAt);

            return (
              <Card key={item.id} className="border hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">
                        {item.resourceName || `Pass #${item.id}`}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3" />
                        {item.userName || item.userEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {start.toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {start.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <Badge
                      variant={
                        item.status === 'CHECKED_IN'
                          ? 'default'
                          : item.status === 'COMPLETED'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
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
