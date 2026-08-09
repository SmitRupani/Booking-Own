import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { Clock, MapPin, ArrowRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

const facilityConfig: Record<string, { emoji: string; category: string }> = {
  'table tennis': { emoji: '🏓', category: 'Indoor Sports' },
  'tennis': { emoji: '🎾', category: 'Racquet Sports' },
  'volleyball': { emoji: '🏐', category: 'Court Sports' },
  'turf': { emoji: '⚽', category: 'Outdoor Field' },
  'football': { emoji: '⚽', category: 'Outdoor Field' },
  'court': { emoji: '🏀', category: 'Court Sports' },
  'badminton': { emoji: '🏸', category: 'Racquet Sports' },
  'cricket': { emoji: '🏏', category: 'Outdoor Field' },
  'gym': { emoji: '🏋️', category: 'Fitness Center' },
  'default': { emoji: '🏟️', category: 'Sports Facility' },
};

function getFacilityMeta(name: string) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(facilityConfig)) {
    if (lower.includes(k)) return v;
  }
  return facilityConfig['default'];
}

export default async function FacilitiesPage() {
  await requireAuth();
  const db = getDb();
  const facilityRows = await db
    .select()
    .from(resources)
    .where(eq(resources.category, 'facility'))
    .orderBy(asc(resources.name));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="success">Facilities</Badge>
          <Badge variant="secondary">{facilityRows.length} Available</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Book a Sports Facility</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Reserve courts, turfs, and sports spaces with instant slot verification and teammate invitations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Facilities Available" value={facilityRows.length} emoji="🏟️" />
        <StatCard label="Operating Hours" value="8:00 AM – 8:00 PM" emoji="🕗" />
        <StatCard label="Advance Booking" value="Up to 7 Days" emoji="📅" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {facilityRows.map((facility) => {
          const meta = getFacilityMeta(facility.name);
          return (
            <Link key={facility.id} href={`/user/facilities/${facility.id}`}>
              <Card className="h-full border transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-primary/10 text-2xl group-hover:scale-110 transition-transform">
                      {meta.emoji}
                    </div>
                    <Badge variant="success">Open</Badge>
                  </div>
                  <div className="mt-3">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {facility.name}
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      {meta.category}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {facility.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{facility.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>8:00 AM – 8:00 PM</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between text-xs text-primary font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      View Available Slots
                    </span>
                    <span>Capacity: {facility.capacity}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
