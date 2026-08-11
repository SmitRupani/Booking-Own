'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Mail,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface CategoryRouting {
  category: string;
  label: string;
  description: string;
  emails: string[];
  enabled: boolean;
}

const DEFAULT_ROUTING: CategoryRouting[] = [
  {
    category: 'facility',
    label: 'Sports Facilities',
    description: 'Notifications for sports court reservations and cancellations',
    emails: ['sports.admin@scaler.com'],
    enabled: true,
  },
  {
    category: 'room',
    label: 'Study & Meeting Rooms',
    description: 'Alerts for conference room bookings and extended meetings',
    emails: ['facilities.desk@scaler.com'],
    enabled: true,
  },
  {
    category: 'equipment',
    label: 'Gear & Apparatus',
    description: 'Notifications for high-value lab apparatus and equipment borrowing',
    emails: ['lab.incharge@scaler.com', 'operations@scaler.com'],
    enabled: true,
  },
];

export default function AdminEmailRoutingPage() {
  const [routings, setRoutings] = useState<CategoryRouting[]>(DEFAULT_ROUTING);
  const [newEmailInput, setNewEmailInput] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddEmail = (catKey: string) => {
    const input = (newEmailInput[catKey] || '').trim().toLowerCase();
    if (!input || !input.includes('@')) return;

    setRoutings(
      routings.map((r) =>
        r.category === catKey && !r.emails.includes(input)
          ? { ...r, emails: [...r.emails, input] }
          : r
      )
    );
    setNewEmailInput({ ...newEmailInput, [catKey]: '' });
  };

  const handleRemoveEmail = (catKey: string, email: string) => {
    setRoutings(
      routings.map((r) =>
        r.category === catKey
          ? { ...r, emails: r.emails.filter((e) => e !== email) }
          : r
      )
    );
  };

  const handleToggleEnabled = (catKey: string) => {
    setRoutings(
      routings.map((r) =>
        r.category === catKey ? { ...r, enabled: !r.enabled } : r
      )
    );
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
            <Badge variant="secondary">Notification Rules</Badge>
            <Badge variant="success">SMTP Dispatcher</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Approval Email Routing</h1>
          <p className="text-sm text-muted-foreground">
            Configure automated email recipient lists for approval requests and cancellation notifications.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-1.5 self-start">
          <Save className="w-4 h-4" />
          Save Configurations
        </Button>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Routing rules saved successfully.
        </div>
      )}

      <div className="space-y-4">
        {routings.map((r) => (
          <Card key={r.category} className="border hover:border-primary/40 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{r.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {r.description}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant={r.enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleEnabled(r.category)}
                  className="text-xs"
                >
                  {r.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {r.emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-muted/40 text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(r.category, email)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md">
                <Input
                  type="email"
                  value={newEmailInput[r.category] || ''}
                  onChange={(e) =>
                    setNewEmailInput({ ...newEmailInput, [r.category]: e.target.value })
                  }
                  placeholder="faculty@scaler.com"
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddEmail(r.category)}
                  className="gap-1 text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Recipient
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
