import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { DoorOpen, Users, MapPin, ArrowRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  await requireAuth();
  const db = getDb();
  const roomRows = await db
    .select()
    .from(resources)
    .where(eq(resources.category, 'room'))
    .orderBy(asc(resources.name));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Study & Meeting Spaces</Badge>
          <Badge variant="success">{roomRows.length} Rooms Available</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Book a Study or Meeting Room</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Reserve conference rooms, quiet study cubicles, and discussion zones with live slot verification.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Rooms" value={roomRows.length} emoji="🚪" />
        <StatCard label="Operating Hours" value="8:00 AM – 8:00 PM" emoji="🕗" />
        <StatCard label="Advance Window" value="Up to 7 Days" emoji="📅" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {roomRows.map((room) => (
          <Link key={room.id} href={`/user/rooms/${room.id}`}>
            <Card className="h-full border transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10 text-2xl group-hover:scale-110 transition-transform">
                    🚪
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Cap: {room.capacity}
                  </Badge>
                </div>
                <div className="mt-3">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {room.name}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {room.description || 'Quiet meeting & discussion room'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {room.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{room.location}</span>
                  </div>
                )}
                <div className="pt-2 border-t flex items-center justify-between text-xs text-primary font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    View Open Slots
                  </span>
                  <span>Available Today</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
