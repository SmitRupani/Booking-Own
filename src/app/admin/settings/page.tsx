'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Settings,
  Clock,
  AlertTriangle,
  Sliders,
  Save,
  CheckCircle2,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';

interface SettingField {
  key: string;
  label: string;
  description: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}

const DEFAULT_SETTINGS: Record<string, SettingField[]> = {
  limits: [
    {
      key: 'MAX_ACTIVE_BOOKINGS_PER_USER',
      label: 'Max Active Reservations Per Student',
      description: 'Maximum concurrent active bookings a single user can hold',
      value: 3,
      unit: 'bookings',
      min: 1,
      max: 10,
    },
    {
      key: 'ADVANCE_BOOKING_DAYS',
      label: 'Advance Booking Window',
      description: 'How many days into the future students are allowed to reserve slots',
      value: 7,
      unit: 'days',
      min: 1,
      max: 30,
    },
    {
      key: 'SPORTS_GEAR_MAX_ITEMS',
      label: 'Max Sports Equipment Kit Items',
      description: 'Maximum pieces of sports gear a student can check out in a single reservation',
      value: 4,
      unit: 'items',
      min: 1,
      max: 10,
    },
  ],
  durations: [
    {
      key: 'DEFAULT_SLOT_MINUTES',
      label: 'Default Facility Slot Duration',
      description: 'Standard block duration for sports courts (badminton, turf)',
      value: 60,
      unit: 'minutes',
      min: 30,
      max: 180,
    },
    {
      key: 'ROOM_MAX_MINUTES',
      label: 'Max Study Room Booking Length',
      description: 'Maximum meeting length allowed per room booking',
      value: 120,
      unit: 'minutes',
      min: 30,
      max: 240,
    },
    {
      key: 'CHECKIN_GRACE_MINUTES',
      label: 'Gate Pass Check-in Grace Window',
      description: 'Window before and after slot start when QR check-in is valid',
      value: 15,
      unit: 'minutes',
      min: 5,
      max: 30,
    },
  ],
  penalties: [
    {
      key: 'PENALTY_THRESHOLD_SUSPENSION',
      label: 'Penalty Points Suspension Threshold',
      description: 'Accumulated points required to trigger automatic account suspension',
      value: 5,
      unit: 'points',
      min: 3,
      max: 15,
    },
    {
      key: 'NO_SHOW_PENALTY_POINTS',
      label: 'No-Show Infraction Penalty',
      description: 'Penalty points automatically assessed if user misses check-in window',
      value: 2,
      unit: 'points',
      min: 1,
      max: 5,
    },
    {
      key: 'LATE_CANCELLATION_HOURS',
      label: 'Late Cancellation Cutoff',
      description: 'Hours before slot start after which cancellation incurs penalty',
      value: 2,
      unit: 'hours',
      min: 1,
      max: 12,
    },
    {
      key: 'SUSPENSION_DURATION_DAYS',
      label: 'Standard Account Suspension Duration',
      description: 'Days of suspension applied once point threshold is reached',
      value: 7,
      unit: 'days',
      min: 1,
      max: 30,
    },
  ],
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleValueChange = (category: string, key: string, newValue: number) => {
    setSettings((prev) => ({
      ...prev,
      [category]: prev[category].map((field) =>
        field.key === key ? { ...field, value: newValue } : field
      ),
    }));
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Global Configurations</Badge>
            <Badge variant="success">Active Policies</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Campus Policy Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure reservation limits, slot durations, penalty point thresholds, and operational rules.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-1.5 self-start">
          <Save className="w-4 h-4" />
          Save Policy Changes
        </Button>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          System policies and limit thresholds saved successfully.
        </div>
      )}

      <Tabs defaultValue="limits" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="limits" className="gap-1.5 text-xs">
            <Sliders className="w-3.5 h-3.5" /> Limits
          </TabsTrigger>
          <TabsTrigger value="durations" className="gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" /> Durations
          </TabsTrigger>
          <TabsTrigger value="penalties" className="gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Disciplinary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reservation Limits</CardTitle>
              <CardDescription>
                Control quota allocations and advance booking windows across all students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.limits.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5 max-w-md">
                    <label className="text-sm font-semibold">{field.label}</label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={field.value}
                      onChange={(e) =>
                        handleValueChange('limits', field.key, parseInt(e.target.value) || 0)
                      }
                      className="w-24 text-center font-mono font-bold"
                    />
                    <span className="text-xs text-muted-foreground w-16">{field.unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="durations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timing & Durations</CardTitle>
              <CardDescription>
                Define operational block lengths, grace periods, and study room limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.durations.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5 max-w-md">
                    <label className="text-sm font-semibold">{field.label}</label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={field.value}
                      onChange={(e) =>
                        handleValueChange('durations', field.key, parseInt(e.target.value) || 0)
                      }
                      className="w-24 text-center font-mono font-bold"
                    />
                    <span className="text-xs text-muted-foreground w-16">{field.unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Disciplinary & Suspension Thresholds</CardTitle>
              <CardDescription>
                Configure automated penalty rules for no-shows, late cancellations, and account locks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.penalties.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5 max-w-md">
                    <label className="text-sm font-semibold">{field.label}</label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={field.value}
                      onChange={(e) =>
                        handleValueChange('penalties', field.key, parseInt(e.target.value) || 0)
                      }
                      className="w-24 text-center font-mono font-bold"
                    />
                    <span className="text-xs text-muted-foreground w-16">{field.unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
