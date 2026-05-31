export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Your Dashboard</h2>
      <p className="text-sm text-muted-foreground mt-2">Overview of upcoming bookings, notifications, and quick actions.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">Upcoming Bookings (placeholder)</div>
        <div className="rounded-lg border p-4">Notifications (placeholder)</div>
        <div className="rounded-lg border p-4">Quick Actions (placeholder)</div>
      </div>
    </div>
  );
}
