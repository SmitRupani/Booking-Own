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
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{greeting.emoji}</span>
          <Badge variant="secondary">Live DB view</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {greeting.text}, your dashboard is connected to the seeded database.
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          This keeps the source app&apos;s booking overview shape, but uses simpler shadcn cards and minimal motion.
        </p>
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
          <Link href="/user/bookings" className="inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted/10">
            View all bookings
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <Card className="h-full cursor-pointer border transition-colors hover:border-accent-blue/30">
                <CardHeader className="space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl">
                    {action.emoji}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
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
