import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function Home() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-6xl px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">SST Booking — Rewritten</h1>
          <p className="text-muted-foreground mt-2">Facilities, rooms, equipment, and admin workflows.</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link href="/user/facilities">
            <Card className="hover:scale-[1.01] transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Facilities</h3>
                  <p className="text-sm text-muted-foreground mt-2">Browse grounds and courts, view availability, create bookings.</p>
                </div>
                <Badge>New</Badge>
              </div>
            </Card>
          </Link>

          <Link href="/user/rooms">
            <Card className="hover:scale-[1.01] transition-transform">
              <div>
                <h3 className="text-lg font-semibold">Rooms</h3>
                <p className="text-sm text-muted-foreground mt-2">Book study and meeting rooms with time slots and capacities.</p>
              </div>
            </Card>
          </Link>

          <Link href="/user/equipment">
            <Card className="hover:scale-[1.01] transition-transform">
              <div>
                <h3 className="text-lg font-semibold">Equipment</h3>
                <p className="text-sm text-muted-foreground mt-2">Reserve equipment items and kits with quantity tracking.</p>
              </div>
            </Card>
          </Link>
        </section>
      </div>
    </div>
  );
}
