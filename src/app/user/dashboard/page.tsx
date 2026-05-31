import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
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

export default async function DashboardPage() {
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
    .orderBy(desc(bookings.startAt));

  const now = new Date();
  const upcomingBookings = bookingRows.filter((booking) => new Date(booking.endAt) >= now);
  const activeBookings = bookingRows.filter((booking) => new Date(booking.startAt) <= now && new Date(booking.endAt) >= now);
  const resourceRows = await db.select().from(resources).orderBy(desc(resources.id));
  const pastBookings = bookingRows.filter((booking) => new Date(booking.endAt) < now);

  const greeting = (() => {
    const hour = now.getHours();
    if (hour < 5) return { text: 'Good night', emoji: '🌙' };
    if (hour < 12) return { text: 'Good morning', emoji: '🌅' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  })();

  const quickActions = [
    { href: '/user/facilities', emoji: '🏟️', title: 'Book Facility', description: 'Turf & courts' },
    { href: '/user/rooms', emoji: '🚪', title: 'Book Room', description: 'Meeting & study rooms' },
    { href: '/user/equipment', emoji: '🎾', title: 'Borrow Equipment', description: 'Sports & lab gear' },
    { href: '/user/bookings', emoji: '📅', title: 'My Bookings', description: 'View & manage' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent-blue/10 via-accent-purple-1/5 to-transparent p-6 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent-purple-1/10 blur-3xl" />

        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xl">{greeting.emoji}</span>
            <Badge variant="info">Live DB view</Badge>
            <Badge variant={upcomingBookings.length > 0 ? 'success' : 'secondary'}>
              {upcomingBookings.length > 0 ? 'Bookings queued' : 'Schedule clear'}
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {greeting.text}, your dashboard is connected to the seeded database.
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            This view mirrors the richer source app structure with quick actions, booking summaries, and recent activity, but keeps the Booking Own shadcn styling.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Upcoming bookings" value={upcomingBookings.length} emoji="📅" />
        <StatCard label="Active now" value={activeBookings.length} emoji="⏱️" />
        <StatCard label="Available resources" value={resourceRows.length} emoji="🏟️" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Direct links to the core booking flows.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/user/bookings">View all bookings</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <Card className="h-full cursor-pointer border transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-card-glow">
                <CardHeader className="space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue/10 text-3xl transition-transform group-hover:scale-110">
                    {action.emoji}
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-accent-blue">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Upcoming bookings</CardDescription>
          <CardTitle>Booked items pulled from the live database</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming bookings are seeded yet.</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 4).map((booking) => (
                <div key={booking.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{booking.resourceName ?? `Resource #${booking.id}`}</p>
                      <p className="text-sm capitalize text-muted-foreground">{booking.resourceCategory ?? 'unassigned'}</p>
                    </div>
                    <Badge variant="secondary">Upcoming</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatDateTime(booking.startAt)} to {formatDateTime(booking.endAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Recent activity</CardDescription>
          <CardTitle>Completed bookings and review signals</CardTitle>
        </CardHeader>
        <CardContent>
          {pastBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed bookings are seeded yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pastBookings.slice(0, 4).map((booking) => (
                <div key={booking.id} className="rounded-lg border p-4 text-sm">
                  <p className="font-medium">{booking.resourceName ?? `Resource #${booking.id}`}</p>
                  <p className="capitalize text-muted-foreground">{booking.resourceCategory ?? 'unassigned'}</p>
                  <p className="mt-2 text-muted-foreground">Completed {formatDateTime(booking.endAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
