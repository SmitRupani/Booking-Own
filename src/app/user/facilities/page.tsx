import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function FacilitiesPage() {
  const db = getDb();
  const facilityRows = await db.select().from(resources).where(eq(resources.category, 'facility')).orderBy(asc(resources.id));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="success">Facilities</Badge>
          <Badge variant="secondary">Live data</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Book a facility</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">Select a sports facility to reserve your slot. This mirrors the source route structure with a simpler Booking Own presentation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Facilities available" value={facilityRows.length} emoji="🏟️" />
        <StatCard label="Open today" value={facilityRows.length > 0 ? 'Yes' : 'No'} emoji="🟢" />
        <StatCard label="Booking window" value="8AM - 8PM" emoji="🕗" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilityRows.map((facility) => (
          <Card key={facility.id} className="border transition-colors hover:border-accent-blue/30">
            <CardHeader>
              <CardDescription className="capitalize">Outdoor sports</CardDescription>
              <CardTitle>{facility.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Capacity: {facility.capacity}</p>
              <p>Record ID: {facility.id}</p>
              <p>Tap the booking flow to view available slots.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Booking tips</CardDescription>
          <CardTitle>Things to know before booking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-lg border p-4">Book up to 7 days in advance.</div>
          <div className="rounded-lg border p-4">Check your penalty status before reserving.</div>
          <div className="rounded-lg border p-4">Keep the booking window simple and readable.</div>
        </CardContent>
      </Card>
    </div>
  );
}
