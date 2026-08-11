'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DatePicker } from '@/components/ui/DatePicker';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { ArrowLeft, MapPin, Users, CheckCircle2, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { getISTToday, formatISTDate } from '@/lib/timezone-client';
import { POLICIES } from '@/lib/policies-constants';
import type { BusySlot } from '@/components/booking/TimeRangePicker';

const TimeRangePicker = dynamic(
  () => import('@/components/booking/TimeRangePicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 flex items-center justify-center bg-card/50 rounded-xl border animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading time slots...</p>
        </div>
      </div>
    ),
  }
);

interface Resource {
  id: number;
  _id?: number | string;
  name: string;
  location?: string;
  capacity?: number;
}

export default function RoomBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [date, setDate] = useState(getISTToday());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [borrowReason, setBorrowReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Availability data
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [workingHours, setWorkingHours] = useState<{ start: string; end: string }>({
    start: '08:00',
    end: '20:00',
  });

  useEffect(() => {
    fetchResource();
  }, [resolvedParams.id]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [date]);

  const fetchResource = async () => {
    try {
      setError('');
      const res = await fetch('/api/resources?category=room');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch room');
        return;
      }

      const found = data.resources.find(
        (r: Resource) => String(r.id || r._id) === String(resolvedParams.id)
      );
      if (!found) {
        setError('Room not found');
        return;
      }
      setResource(found);
    } catch {
      setError('An unexpected error occurred loading room.');
    }
  };

  const fetchAvailability = async () => {
    if (!resource?.id || !date) return;

    setLoadingAvailability(true);
    try {
      const res = await fetch(
        `/api/availability?resourceId=${resource.id}&date=${date}`
      );
      const data = await res.json();

      if (res.ok) {
        setBusySlots(data.busySlots || []);
        if (data.workingHours?.start && data.workingHours?.end) {
          setWorkingHours({
            start: data.workingHours.start,
            end: data.workingHours.end,
          });
        }
      } else {
        setBusySlots([]);
      }
    } catch {
      setBusySlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (resource) {
      fetchAvailability();
    }
  }, [resource, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startDateTime = new Date(`${date}T${selectedSlot.start}:00+05:30`);
      const endDateTime = new Date(`${date}T${selectedSlot.end}:00+05:30`);

      const payload = {
        resourceId: resource.id,
        kind: 'ROOM',
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        borrowReason: borrowReason.trim() || undefined,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create room booking');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/user/bookings');
      }, 1500);
    } catch {
      setError('An error occurred during booking.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 inline-block mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Room Reserved!</h2>
        <p className="text-sm text-muted-foreground">
          Your booking for {resource?.name} has been confirmed. Redirecting to your bookings...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/user/rooms">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Rooms
          </Button>
        </Link>
      </div>

      {resource && (
        <div className="rounded-2xl border p-5 sm:p-6 bg-card/60 backdrop-blur space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-primary">
                Room Reservation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">{resource.name}</h1>
              {resource.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {resource.location}
                </p>
              )}
            </div>
            <Badge variant="secondary">Capacity: {resource.capacity} People</Badge>
          </div>
        </div>
      )}

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Choose Date</CardTitle>
            <CardDescription>Select when you need the study/meeting room</CardDescription>
          </CardHeader>
          <CardContent>
            <DatePicker
              value={date}
              onChange={(d) => setDate(typeof d === 'string' ? d : d.toISOString().split('T')[0])}
              minDate={getISTToday()}
            />
          </CardContent>
        </Card>

        {/* 2. Slot Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Select Time Slot</CardTitle>
            <CardDescription>
              Select an open duration on {formatISTDate(new Date(date))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TimeRangePicker
              date={date}
              busySlots={busySlots}
              workingHours={workingHours}
              onSelect={(start, end) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
                const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
                setSelectedSlot({ start: startStr, end: endStr });
              }}
            />
            {selectedSlot && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Selected Slot:</span>
                <span className="text-sm font-semibold text-primary">
                  {selectedSlot.start} – {selectedSlot.end} IST
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Meeting Purpose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Meeting Purpose (Optional)</CardTitle>
            <CardDescription>Briefly describe the purpose of this reservation</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={borrowReason}
              onChange={(e) => setBorrowReason(e.target.value)}
              placeholder="e.g. Group study session, project discussion"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          disabled={!selectedSlot || loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading ? 'Confirming Room...' : 'Reserve Room Slot'}
        </Button>
      </form>
    </div>
  );
}
