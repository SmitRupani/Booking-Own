import { Badge } from '@/components/ui/Badge';
import { StatCard, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { bookings, resources, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = getDb();

  const bookingRows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      resourceName: resources.name,
      resourceCategory: resources.category,
      userId: bookings.userId,
    })
    .from(bookings)
    .leftJoin(resources, eq(bookings.resourceId, resources.id))
    .orderBy(desc(bookings.createdAt));

  const resourceRows = await db.select().from(resources).orderBy(desc(resources.id));
  const userRows = await db.select().from(users).orderBy(desc(users.id));
  const now = new Date();
  const activeBookings = bookingRows.filter((booking) => new Date(booking.startAt) <= now && new Date(booking.endAt) >= now);
  const reviewCandidates = bookingRows.filter((booking) => new Date(booking.endAt) < now);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent-blue/10 via-accent-purple-1/5 to-transparent p-6 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/10 blur-3xl" />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Operational summary</Badge>
            <Badge variant={reviewCandidates.length > 0 ? 'warning' : 'success'}>
              {reviewCandidates.length > 0 ? 'Review queue populated' : 'No review candidates yet'}
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Admin dashboard with live inventory and review signals</h2>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            This mirrors the source app&apos;s admin overview pattern, but keeps the Booking Own shadcn presentation and reads from the seeded tables.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Users" value={userRows.length} emoji="👤" />
        <StatCard label="Resources" value={resourceRows.length} emoji="🧰" />
        <StatCard label="Active bookings" value={activeBookings.length} emoji="📌" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Review queue</CardDescription>
            <CardTitle>Recently completed bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review candidates are seeded yet.</p>
            ) : (
              <div className="space-y-3">
                {reviewCandidates.slice(0, 4).map((booking) => (
                  <div key={booking.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{booking.resourceName ?? `Resource #${booking.id}`}</p>
                        <p className="capitalize text-muted-foreground">{booking.resourceCategory ?? 'unassigned'}</p>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">User #{booking.userId}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Capacity check</CardDescription>
            <CardTitle>Seeded resource inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {resourceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Seed resources first to verify this panel.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {resourceRows.slice(0, 4).map((resource) => (
                  <div key={resource.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{resource.name}</p>
                        <p className="capitalize text-muted-foreground">{resource.category}</p>
                      </div>
                      <Badge variant="info">{resource.capacity} cap</Badge>
                    </div>
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
