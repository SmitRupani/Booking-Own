import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { StatCard, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getDb } from '@/lib/db/client';
import { bookings, resources, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import {
  Wrench,
  CheckCircle,
  Clock,
  Users,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BarChart3,
  Mail,
  DoorOpen,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAuth(['ADMIN']);
  const db = getDb();

  const [bookingRows, resourceRows, userRows] = await Promise.all([
    db
      .select({
        id: bookings.id,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        kind: bookings.kind,
        resourceName: resources.name,
        resourceCategory: resources.category,
        userName: users.name,
      })
      .from(bookings)
      .leftJoin(resources, eq(bookings.resourceId, resources.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(bookings.createdAt)),
    db.select().from(resources).orderBy(desc(resources.id)),
    db.select().from(users).orderBy(desc(users.id)),
  ]);

  const now = new Date();
  const pendingApprovals = bookingRows.filter((b) => b.status === 'PENDING');
  const activeBookings = bookingRows.filter(
    (b) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status) && new Date(b.endAt) >= now
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Administrative Operations</Badge>
          <Badge variant={pendingApprovals.length > 0 ? 'warning' : 'success'}>
            {pendingApprovals.length > 0
              ? `${pendingApprovals.length} Pending Approval`
              : 'All Approvals Cleared'}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Admin Command Center</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Live overview of campus facilities, student reservation queues, inventory levels, and operational settings.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered Users" value={userRows.length} emoji="👥" />
        <StatCard label="Campus Spaces" value={resourceRows.length} emoji="🏟️" />
        <StatCard label="Active Bookings" value={activeBookings.length} emoji="📌" />
        <StatCard label="Review Queue" value={pendingApprovals.length} emoji="⏳" />
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/lab-approvals">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                {pendingApprovals.length > 0 && (
                  <Badge variant="warning">{pendingApprovals.length} Pending</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Lab Approvals Queue
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Review and grant access for specialized lab equipment and multi-day loans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/resources">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <Badge variant="secondary">{resourceRows.length} Spaces</Badge>
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Resource & Gear Directory
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Manage court operating hours, room capacities, and gear inventory stock.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/blocks">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <Badge variant="warning">Maintenance</Badge>
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Blackout & Maintenance
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Schedule court maintenance windows and reserve spaces for campus tournaments.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/penalties">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <Badge variant="destructive">Disciplinary</Badge>
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Student Penalties Desk
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Assign infraction points, forgive accidental penalties, and manage suspensions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/bookings">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <Badge variant="secondary">Registry</Badge>
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Master Booking Registry
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Search all reservations, filter by roll number, and execute force-cancellations.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="h-full border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <Badge variant="success">Insights</Badge>
              </div>
              <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors flex items-center gap-1.5">
                Utilization Analytics
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                View peak booking heatmaps, cancellation statistics, and return compliance.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Pending Approvals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Pending Review Queue</CardTitle>
            <CardDescription>Equipment requests requiring administrative sign-off</CardDescription>
          </div>
          <Link href="/admin/lab-approvals">
            <Button variant="outline" size="sm" className="text-xs">
              View All Queue
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
              No approval requests pending.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border flex items-center justify-between gap-4 text-sm"
                >
                  <div>
                    <h4 className="font-semibold">{b.resourceName || `Booking #${b.id}`}</h4>
                    <p className="text-xs text-muted-foreground">
                      Requested by: {b.userName || 'Student'}
                    </p>
                  </div>
                  <Badge variant="warning">Awaiting Action</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
