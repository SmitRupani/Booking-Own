import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function FacilitiesPage() {
  const db = getDb();
  const facilityRows = await db.select().from(resources).orderBy(asc(resources.id));

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Facilities</h2>
        <p className="mt-2 text-sm text-muted-foreground">Live facilities loaded from the seeded database so you can verify the route after each migration.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total facilities</CardDescription>
            <CardTitle>{facilityRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Indoor spaces</CardDescription>
            <CardTitle>{facilityRows.filter((facility) => facility.category !== 'facility').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outdoor facilities</CardDescription>
            <CardTitle>{facilityRows.filter((facility) => facility.category === 'facility').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilityRows.map((facility) => (
          <Card key={facility.id}>
            <CardHeader>
              <CardDescription className="capitalize">{facility.category}</CardDescription>
              <CardTitle>{facility.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Capacity: {facility.capacity}</p>
              <p>Record ID: {facility.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
