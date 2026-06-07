import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import { getDb } from '@/lib/db/client';
import { bookings, resources, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function AdminBookings() {
  const db = getDb();

  const bookingRows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      resourceName: resources.name,
      resourceCategory: resources.category,
      userName: users.name,
    })
    .from(bookings)
    .leftJoin(resources, eq(bookings.resourceId, resources.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .orderBy(desc(bookings.startAt));

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">All Bookings</h2>
      <p className="text-sm text-muted-foreground mt-2">View and manage bookings across the system.</p>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>Live bookings loaded from the seeded database.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No bookings found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th className="px-3 py-2">Resource</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">User</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {bookingRows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.resourceName ?? `Resource`}</TableCell>
                      <TableCell>{b.resourceCategory ?? 'Unassigned'}</TableCell>
                      <TableCell>{formatDateTime(b.startAt)}</TableCell>
                      <TableCell>{formatDateTime(b.endAt)}</TableCell>
                      <TableCell>{b.userName ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
