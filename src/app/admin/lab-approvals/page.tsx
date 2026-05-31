import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import { getDb } from '@/lib/db/client';
import { bookings, resources } from '@/lib/db/schema';
import { asc, desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function LabApprovalsPage() {
  const db = getDb();

  const resourceRows = await db.select().from(resources).orderBy(asc(resources.id));
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
    .orderBy(desc(bookings.startAt));

  const now = new Date();
  const pendingBookings = bookingRows.filter((booking) => new Date(booking.startAt) > now);
  const roomResources = resourceRows.filter((resource) => resource.category === 'room');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">Approvals</h2>
        <p className="mt-2 text-sm text-muted-foreground">Seed-backed approval queue for room and facility bookings, kept read-only until the real workflow is wired in.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending bookings" value={pendingBookings.length} emoji="🟡" />
        <StatCard label="Rooms tracked" value={roomResources.length} emoji="🏫" />
        <StatCard label="Total resources" value={resourceRows.length} emoji="📦" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Approval queue</CardDescription>
            <CardTitle>Upcoming bookings to review</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming bookings were seeded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th className="px-3 py-2 text-left">Resource</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Start</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {pendingBookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.resourceName ?? `Resource #${booking.id}`}</TableCell>
                      <TableCell className="capitalize">{booking.resourceCategory ?? 'unassigned'}</TableCell>
                      <TableCell>{formatDateTime(booking.startAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Resource inventory</CardDescription>
            <CardTitle>Rooms available for approval</CardTitle>
          </CardHeader>
          <CardContent>
            {roomResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No room resources were seeded yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {roomResources.map((resource) => (
                  <div key={resource.id} className="rounded-lg border p-4">
                    <p className="font-medium">{resource.name}</p>
                    <p className="capitalize text-muted-foreground">{resource.category}</p>
                    <p className="mt-2 text-muted-foreground">Capacity {resource.capacity}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
