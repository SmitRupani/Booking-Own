import Link from 'next/link';

import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import { bookings, resources } from '@/lib/db/schema';
import { getDb } from '@/lib/db/client';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function BookingsPage() {
  const db = getDb();

  const bookingRows = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      resourceId: bookings.resourceId,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      resourceName: resources.name,
      resourceCategory: resources.category,
    })
    .from(bookings)
    .leftJoin(resources, eq(bookings.resourceId, resources.id))
    .orderBy(desc(bookings.startAt));

  const now = new Date();
  const upcomingCount = bookingRows.filter((booking) => new Date(booking.endAt) >= now).length;
  const pastCount = bookingRows.length - upcomingCount;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">My Bookings</h2>
        <p className="mt-2 text-sm text-muted-foreground">Live data from the seeded database, rendered from the Drizzle tables.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>All bookings</CardDescription>
            <CardTitle>{bookingRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Upcoming or active</CardDescription>
            <CardTitle>{upcomingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Past bookings</CardDescription>
            <CardTitle>{pastCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking history</CardTitle>
          <CardDescription>Each row is loaded from the database so you can validate the seed and schema wiring.</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              No bookings were found. Seed the database and reload this page to verify the connection.
              <div className="mt-4">
                <Link href="/user/facilities" className="font-medium text-primary underline-offset-4 hover:underline">
                  Browse facilities
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </TableHeader>
              <TableBody>
                {bookingRows.map((booking) => {
                  const startAt = new Date(booking.startAt);
                  const endAt = new Date(booking.endAt);
                  const status = endAt < now ? 'Past' : startAt > now ? 'Upcoming' : 'Active';

                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.resourceName ?? `Resource #${booking.resourceId}`}</TableCell>
                      <TableCell>{booking.resourceCategory ?? 'Unassigned'}</TableCell>
                      <TableCell>{formatDateTime(startAt)}</TableCell>
                      <TableCell>{formatDateTime(endAt)}</TableCell>
                      <TableCell>
                        <Badge variant={status === 'Active' ? 'success' : status === 'Upcoming' ? 'warning' : 'default'}>
                          {status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
