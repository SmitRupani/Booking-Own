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
import { ArrowLeft, Users, X, MapPin, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { getISTToday, formatISTDate } from '@/lib/timezone-client';
import { POLICIES } from '@/lib/policies';
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
  sharedGroupId?: string;
}

export default function FacilityBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [date, setDate] = useState(getISTToday());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Group booking state
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [memberEmails, setMemberEmails] = useState<string[]>(['']);

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
      const res = await fetch('/api/resources?category=facility');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch facility');
        return;
      }

      const found = data.resources.find(
        (r: Resource) => String(r.id || r._id) === String(resolvedParams.id)
      );
      if (!found) {
        setError('Facility not found');
        return;
      }
      setResource(found);
    } catch {
      setError('An unexpected error occurred loading facility.');
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

  const handleAddMember = () => {
    if (memberEmails.length < 10) {
      setMemberEmails([...memberEmails, '']);
    }
  };

  const handleRemoveMember = (index: number) => {
    setMemberEmails(memberEmails.filter((_, i) => i !== index));
  };

  const handleMemberEmailChange = (index: number, val: string) => {
    const updated = [...memberEmails];
    updated[index] = val;
    setMemberEmails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build ISO timestamps in IST
      const startDateTime = new Date(`${date}T${selectedSlot.start}:00+05:30`);
      const endDateTime = new Date(`${date}T${selectedSlot.end}:00+05:30`);

      const validEmails = isGroupBooking
        ? memberEmails.map((em) => em.trim()).filter((em) => em.length > 0)
        : [];

      const payload = {
        resourceId: resource.id,
        kind: 'FACILITY',
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        isGroupBooking: isGroupBooking && validEmails.length > 0,
        participants: validEmails,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create booking');
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
        <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
        <p className="text-sm text-muted-foreground">
          Your reservation for {resource?.name} has been confirmed. Redirecting to your bookings...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/user/facilities">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Facilities
          </Button>
        </Link>
      </div>

      {resource && (
        <div className="rounded-2xl border p-5 sm:p-6 bg-card/60 backdrop-blur space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-primary">
                Facility Reservation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">{resource.name}</h1>
              {resource.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {resource.location}
                </p>
              )}
            </div>
            <Badge variant="success">Available</Badge>
          </div>
        </div>
      )}

      {error && <ErrorDisplay error={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Choose Date</CardTitle>
            <CardDescription>Select when you want to book this facility</CardDescription>
          </CardHeader>
          <CardContent>
            <DatePicker
              value={date}
              onChange={setDate}
              minDate={getISTToday()}
              maxDays={POLICIES.ADVANCE_BOOKING_DAYS}
            />
          </CardContent>
        </Card>

        {/* 2. Slot Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Select Time Slot</CardTitle>
            <CardDescription>
              Select an open duration on {formatISTDate(date)}
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

        {/* 3. Group Booking Option */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">3. Group Reservation</CardTitle>
                <CardDescription>Invite team members to play with you</CardDescription>
              </div>
              <Button
                type="button"
                variant={isGroupBooking ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsGroupBooking(!isGroupBooking)}
              >
                <Users className="w-4 h-4 mr-1.5" />
                {isGroupBooking ? 'Enabled' : 'Add Friends'}
              </Button>
            </div>
          </CardHeader>
          {isGroupBooking && (
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter student email addresses (@sst.scaler.com):
              </p>
              {memberEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleMemberEmailChange(i, e.target.value)}
                    placeholder="student@sst.scaler.com"
                    className="text-xs"
                  />
                  {memberEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(i)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {memberEmails.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMember}
                  className="text-xs"
                >
                  + Add Participant
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          disabled={!selectedSlot || loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading ? 'Confirming Reservation...' : 'Confirm & Reserve Slot'}
        </Button>
      </form>
    </div>
  );
}
