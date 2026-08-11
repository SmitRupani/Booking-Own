'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function AdminBulkOperationsPage() {
  const [cancelDate, setCancelDate] = useState('');
  const [cancelCategory, setCancelCategory] = useState('all');
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', action: async () => {} });

  const handleBulkCancel = async () => {
    if (!cancelDate || !cancelReason) {
      setFeedback({
        type: 'error',
        message: 'Please specify both the cancellation date and reason.',
      });
      return;
    }

    setProcessing(true);
    setFeedback(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setFeedback({
        type: 'success',
        message: `Successfully executed bulk cancellation for ${cancelDate} (${cancelCategory}). All affected students will receive notice.`,
      });
      setConfirmModal({ open: false, title: '', action: async () => {} });
      setCancelReason('');
    } catch {
      setFeedback({ type: 'error', message: 'Failed to process bulk cancellation.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSemesterReset = async () => {
    setProcessing(true);
    setFeedback(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setFeedback({
        type: 'success',
        message: 'Semester penalty reset executed. All student disciplinary points set to 0.',
      });
      setConfirmModal({ open: false, title: '', action: async () => {} });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to reset student penalties.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Administrative Utilities</Badge>
          <Badge variant="warning">Batch Actions</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Bulk Operations Console</h1>
        <p className="text-sm text-muted-foreground">
          Execute emergency mass cancellations, weather rainout closures, and semester-wide disciplinary resets.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Emergency Mass Cancellation Card */}
        <Card className="border hover:border-primary/40 transition-all">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-lg text-foreground">Emergency Date Cancellation</CardTitle>
            </div>
            <CardDescription>
              Cancel all bookings on a target date due to rainouts, facility closures, or unforeseen emergencies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Target Date *</label>
              <Input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category Scope</label>
              <select
                value={cancelCategory}
                onChange={(e) => setCancelCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Resources (Campus-wide)</option>
                <option value="facility">Sports Facilities (Courts/Turf)</option>
                <option value="room">Study & Meeting Rooms</option>
                <option value="equipment">Sports & Lab Gear</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Cancellation Reason *</label>
              <Input
                type="text"
                placeholder="e.g. Heavy rain, power maintenance, campus closure"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button
              variant="destructive"
              className="w-full gap-2 text-xs"
              disabled={processing || !cancelDate || !cancelReason}
              onClick={() =>
                setConfirmModal({
                  open: true,
                  title: `Cancel all ${cancelCategory} reservations on ${cancelDate}?`,
                  action: handleBulkCancel,
                })
              }
            >
              <Trash2 className="w-4 h-4" />
              Execute Mass Cancellation
            </Button>
          </CardContent>
        </Card>

        {/* Semester Reset Card */}
        <Card className="border hover:border-primary/40 transition-all">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <RotateCcw className="w-5 h-5" />
              <CardTitle className="text-lg text-foreground">Semester Discipline Reset</CardTitle>
            </div>
            <CardDescription>
              Reset all student infraction points to zero at the beginning of a new academic term.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col justify-between h-[calc(100%-88px)]">
            <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground space-y-2">
              <p>
                <strong>Important:</strong> This operation clears all accumulated penalty points across all enrolled students and unfreezes accounts with active point-based suspensions.
              </p>
              <p>
                Permanent disciplinary blocks manually enacted by administrative staff will remain preserved.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
              disabled={processing}
              onClick={() =>
                setConfirmModal({
                  open: true,
                  title: 'Reset all student penalty points to 0 for the new semester?',
                  action: handleSemesterReset,
                })
              }
            >
              <Sparkles className="w-4 h-4" />
              Execute Semester Penalty Reset
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, title: '', action: async () => {} })}
        title="Confirm Bulk Operation"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium">{confirmModal.title}</p>
          <p className="text-xs text-muted-foreground">
            This batch operation cannot be automatically undone. Please confirm to proceed.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="w-1/2 text-xs"
              onClick={() =>
                setConfirmModal({ open: false, title: '', action: async () => {} })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-1/2 text-xs"
              disabled={processing}
              onClick={confirmModal.action}
            >
              {processing ? 'Processing...' : 'Confirm & Execute'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
