import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function getCapacityBadge(capacity: number) {
  if (capacity <= 6) return 'Small';
  if (capacity <= 12) return 'Medium';
  if (capacity <= 24) return 'Large';
  return 'Hall';
}

export default async function RoomsPage() {
  const db = getDb();
  const roomRows = await db.select().from(resources).where(eq(resources.category, 'room')).orderBy(asc(resources.id));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="info">Rooms</Badge>
          <Badge variant="secondary">Live data</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Book a room</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">Choose a meeting or study room with a simple shadcn layout and no extra motion.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Rooms available" value={roomRows.length} emoji="🚪" />
        <StatCard label="Small rooms" value={roomRows.filter((room) => room.capacity <= 6).length} emoji="🟦" />
        <StatCard label="Medium rooms" value={roomRows.filter((room) => room.capacity > 6 && room.capacity <= 12).length} emoji="🟨" />
        <StatCard label="Large rooms" value={roomRows.filter((room) => room.capacity > 12).length} emoji="🟩" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roomRows.map((room) => (
          <Card key={room.id} className="border transition-colors hover:border-accent-blue/30">
            <CardHeader>
              <CardDescription>{getCapacityBadge(room.capacity)} room</CardDescription>
              <CardTitle>{room.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Capacity: {room.capacity}</p>
              <p>Record ID: {room.id}</p>
              <p>Use this route to verify the room inventory and booking flow.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Booking tip</CardDescription>
          <CardTitle>Peak-hour planning</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Rooms are easiest to verify when the page shows capacity labels and the live count from the database.
        </CardContent>
      </Card>
    </div>
  );
}
