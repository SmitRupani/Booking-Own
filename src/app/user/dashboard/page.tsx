import Card from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Your Dashboard</h2>
      <p className="text-sm text-muted-foreground mt-2">Overview of upcoming bookings, notifications, and quick actions.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Card>
            <h3 className="font-semibold">Upcoming Bookings</h3>
            <p className="text-sm text-muted-foreground mt-2">No upcoming bookings yet.</p>
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground mt-2">You have 0 new notifications.</p>
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="font-semibold">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mt-2">Create a booking or view history.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
