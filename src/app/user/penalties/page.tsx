import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { POLICIES, loadDynamicPolicies } from '@/lib/policies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, ShieldCheck, Clock, CheckCircle2, Info, Ban } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PenaltyGuidePage() {
  const authUser = await requireAuth(['STUDENT', 'ADMIN']);
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user) redirect('/login');

  const now = new Date();
  const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > now;
  const isBlocked = user.blocked;
  const points = user.penaltyPoints || 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={isBlocked ? 'destructive' : isSuspended ? 'warning' : 'success'}>
            {isBlocked ? 'Account Blocked' : isSuspended ? 'Suspended' : 'Good Standing'}
          </Badge>
          <Badge variant="secondary">{points} Penalty Points</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Rules & Penalty Status</h1>
        <p className="text-sm text-muted-foreground">
          Overview of campus resource policies, your disciplinary standing, and penalty recovery guidelines.
        </p>
      </div>

      {/* Disciplinary Banner */}
      {isBlocked ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 flex items-start gap-4 text-destructive">
          <Ban className="w-8 h-8 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Account Permanently Blocked</h3>
            <p className="text-sm opacity-90">
              Your account has been restricted due to repeat policy violations. Please contact the campus operations desk.
            </p>
          </div>
        </div>
      ) : isSuspended ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-4 text-amber-400">
          <AlertTriangle className="w-8 h-8 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Temporary Suspension Active</h3>
            <p className="text-sm opacity-90">
              Your booking privileges are suspended until{' '}
              {new Date(user.suspendedUntil!).toLocaleDateString('en-IN', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-start gap-4 text-emerald-400">
          <ShieldCheck className="w-8 h-8 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Your Account is in Good Standing</h3>
            <p className="text-sm opacity-90">
              You have full access to reserve sports turfs, study rooms, equipment kits, and library volumes.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Penalty Points" value={points} emoji="⚠️" />
        <StatCard label="Penalty Threshold" value="4 Points" emoji="🎯" />
        <StatCard label="Advance Booking Window" value="7 Days" emoji="📅" />
      </div>

      {/* Rules Policy Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Booking & Slot Invariants
            </CardTitle>
            <CardDescription>Rules to follow for smooth reservations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="p-3 rounded-lg border bg-card/40 flex items-start gap-3">
              <span className="text-lg">🏟️</span>
              <div>
                <p className="font-semibold text-foreground">Sports Facilities</p>
                <p className="text-xs mt-0.5">Maximum 2 active facility bookings at any given time.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-card/40 flex items-start gap-3">
              <span className="text-lg">🚪</span>
              <div>
                <p className="font-semibold text-foreground">Study & Meeting Rooms</p>
                <p className="text-xs mt-0.5">Slots range from 30 mins to 2 hours maximum per session.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-card/40 flex items-start gap-3">
              <span className="text-lg">🎾</span>
              <div>
                <p className="font-semibold text-foreground">Sports & Lab Gear</p>
                <p className="text-xs mt-0.5">Same-day return for equipment unless explicit faculty approval granted.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Violation Penalties
            </CardTitle>
            <CardDescription>Points assigned for policy infractions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
              <div>
                <p className="font-semibold text-foreground">No-Show Violation</p>
                <p className="text-xs text-muted-foreground">Not checking in within 15 min of slot start</p>
              </div>
              <Badge variant="destructive">+2 Points</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
              <div>
                <p className="font-semibold text-foreground">Late Equipment Return</p>
                <p className="text-xs text-muted-foreground">Returning gear after slot window ends</p>
              </div>
              <Badge variant="destructive">+1 Point</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
              <div>
                <p className="font-semibold text-foreground">Damaged Item</p>
                <p className="text-xs text-muted-foreground">Returning equipment in non-working condition</p>
              </div>
              <Badge variant="destructive">+2 Points</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
