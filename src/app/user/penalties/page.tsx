import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

export default async function PenaltiesPage() {
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
  const pastBookings = bookingRows.filter((booking) => new Date(booking.endAt) < now);
  const activeBookings = bookingRows.filter((booking) => new Date(booking.startAt) <= now && new Date(booking.endAt) >= now);
  const upcomingBookings = bookingRows.filter((booking) => new Date(booking.startAt) > now);
  const totalHours = pastBookings.reduce((sum, booking) => sum + (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 36e5, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="warning">Rules & penalties</Badge>
          <Badge variant="secondary">Live booking history</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Penalty review guide backed by seeded bookings</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          This keeps the source app&apos;s information structure: booking limits, penalty rules, escalation guidance, and a review queue, but renders it with Booking Own&apos;s shadcn cards and tables.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Past bookings" value={pastBookings.length} emoji="⏮️" />
        <StatCard label="Active bookings" value={activeBookings.length} emoji="⏳" />
        <StatCard label="Upcoming bookings" value={upcomingBookings.length} emoji="⏭️" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Limit summary</CardDescription>
            <CardTitle>{pastBookings.length > 0 ? 'Review-ready' : 'No history yet'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{totalHours.toFixed(1)} hours of past booking history are available for review.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Review trigger</CardDescription>
            <CardTitle>Completed bookings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Completed bookings are the primary source for no-show and late-return review candidates.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open status</CardDescription>
            <CardTitle>{activeBookings.length > 0 ? 'Active usage' : 'Idle queue'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Active bookings help surface items that may still be in progress.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next check</CardDescription>
            <CardTitle>{upcomingBookings.length > 0 ? 'Upcoming usage' : 'No upcoming load'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Upcoming bookings are useful for planning the review timeline.</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Penalty rules</CardDescription>
            <CardTitle>Review guidance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="rounded-lg border p-4">No-shows may be reviewed against past bookings that ended before now.</li>
              <li className="rounded-lg border p-4">Late returns can be flagged from active or recently completed bookings.</li>
              <li className="rounded-lg border p-4">This page is read-only and uses seeded booking data as the verification source.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Escalation flow</CardDescription>
            <CardTitle>What happens when review finds an issue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 0</p>
                <p>First review stage for a new booking issue.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 1</p>
                <p>Escalated review for repeat or unresolved cases.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Level 2</p>
                <p>Critical review bucket used for persistent issues.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Penalty review queue</CardDescription>
          <CardTitle>Recent completed bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {pastBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed bookings were seeded yet.</p>
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
                {pastBookings.slice(0, 4).map((booking) => (
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

      <Card>
        <CardHeader>
          <CardDescription>FAQ</CardDescription>
          <CardTitle>How to read this page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What do the stats mean?</p>
              <p>Past bookings, active bookings, and upcoming bookings are pulled directly from the seeded booking rows.</p>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What should I check first?</p>
              <p>Confirm completed bookings are visible, then compare the counts to the dashboard and bookings pages.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
