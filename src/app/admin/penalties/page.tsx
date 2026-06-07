import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import { getDb } from '@/lib/db/client';
import { bookings, resources } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function AdminPenalties() {
  const db = getDb();
  const bookingRows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      resourceName: resources.name,
      resourceCategory: resources.category,
    })
    .from(bookings)
    .leftJoin(resources, eq(bookings.resourceId, resources.id))
    .orderBy(desc(bookings.endAt));

  const now = new Date();
  const reviewCandidates = bookingRows.filter((booking) => new Date(booking.endAt) < now);
  const activeBookings = bookingRows.filter((booking) => new Date(booking.startAt) <= now && new Date(booking.endAt) >= now);
  const upcomingBookings = bookingRows.filter((booking) => new Date(booking.startAt) > now);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="warning">Admin penalties</Badge>
          <Badge variant="secondary">Live review queue</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Admin review workspace with seeded booking signals</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          This follows the richer source workflow structure while keeping the Booking Own UI idiomatic: stat cards, review guidance, and recent-booking tables.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Review candidates" value={reviewCandidates.length} emoji="⚠️" />
        <StatCard label="Active bookings" value={activeBookings.length} emoji="📍" />
        <StatCard label="Upcoming bookings" value={upcomingBookings.length} emoji="🧾" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Penalty rules</CardDescription>
            <CardTitle>Review guidance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">Completed bookings form the initial review queue.</div>
              <div className="rounded-lg border p-4">Active bookings help surface in-progress reservations that may need follow-up.</div>
              <div className="rounded-lg border p-4">Upcoming bookings can be used to plan review timing and admin actions.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Escalation snapshot</CardDescription>
            <CardTitle>What admins should look for</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 0</p>
                <p>Initial review for a booking discrepancy.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 1</p>
                <p>Repeated or unresolved issues escalate here.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 2</p>
                <p>Highest severity bucket for persistent cases.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Admin review queue</CardDescription>
          <CardTitle>Recently completed bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No review candidates are seeded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <th className="px-3 py-2 text-left">Resource</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Start</th>
                  <th className="px-3 py-2 text-left">End</th>
                </tr>
              </TableHeader>
              <TableBody>
                {reviewCandidates.slice(0, 5).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.resourceName ?? `Resource #${booking.id}`}</TableCell>
                    <TableCell className="capitalize">{booking.resourceCategory ?? 'unassigned'}</TableCell>
                    <TableCell>{formatDateTime(booking.startAt)}</TableCell>
                    <TableCell>{formatDateTime(booking.endAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
