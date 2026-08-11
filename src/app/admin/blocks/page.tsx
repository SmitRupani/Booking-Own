'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Wrench,
  Calendar,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { getISTToday } from '@/lib/timezone-client';

interface BlockItem {
  id: number;
  resourceId: number;
  resourceName?: string;
  reason: string;
  type: 'MAINTENANCE' | 'EVENT';
  startAt: string;
  endAt: string;
}

interface Resource {
  id: number;
  name: string;
}

export default function AdminBlocksPage() {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const [resourceId, setResourceId] = useState('');
  const [reason, setReason] = useState('');
  const [blockType, setBlockType] = useState<'MAINTENANCE' | 'EVENT'>('MAINTENANCE');
  const [startDate, setStartDate] = useState(getISTToday());
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(getISTToday());
  const [endTime, setEndTime] = useState('20:00');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resRes = await fetch('/api/resources');
      if (resRes.ok) {
        const data = await resRes.json();
        setResources(data.resources || []);
        if (data.resources?.length > 0 && !resourceId) {
          setResourceId(String(data.resources[0].id));
        }
      }
    } catch {
      setError('Failed to load blocks data');
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const start = new Date(`${startDate}T${startTime}:00+05:30`);
      const end = new Date(`${endDate}T${endTime}:00+05:30`);

      const payload = {
        resourceId: Number(resourceId),
        reason: reason.trim() || 'Scheduled Maintenance',
        type: blockType,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };

      // Create booking with status CANCELLED / blocked window or post to block endpoint
      const selectedRes = resources.find((r) => r.id === Number(resourceId));
      const newBlock: BlockItem = {
        id: Date.now(),
        resourceId: Number(resourceId),
        resourceName: selectedRes?.name || `Resource #${resourceId}`,
        reason: payload.reason,
        type: payload.type,
        startAt: payload.startAt,
        endAt: payload.endAt,
      };

      setBlocks([newBlock, ...blocks]);
      setModalOpen(false);
      setReason('');
    } catch {
      setError('Failed to create blackout block');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlock = (id: number) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Operations</Badge>
            <Badge variant="warning">{blocks.length} Active Blocks</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Maintenance & Blackout Windows</h1>
          <p className="text-sm text-muted-foreground">
            Schedule facility maintenance windows, institute sports tournaments, and block reservations.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          Create Blackout Window
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {blocks.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No blackout blocks currently active.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <Card key={block.id} className="border hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{block.resourceName}</h4>
                      <Badge variant="warning">{block.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{block.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(block.startAt).toLocaleDateString('en-IN')} –{' '}
                    {new Date(block.endAt).toLocaleDateString('en-IN')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Block Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Blackout Window"
      >
        <form onSubmit={handleCreateBlock} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Resource:</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-md border bg-background text-sm"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Block Type:</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as any)}
              className="w-full h-10 px-3 mt-1 rounded-md border bg-background text-sm"
            >
              <option value="MAINTENANCE">Facility Maintenance</option>
              <option value="EVENT">Campus Event / Tournament</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Reason / Description:</label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Badminton court wooden floor polishing"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Start Date:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">End Date:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-1/2">
              {submitting ? 'Creating...' : 'Schedule Block'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
