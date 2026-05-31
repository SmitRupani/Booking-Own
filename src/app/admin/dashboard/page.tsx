import Card from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
      <p className="text-sm text-muted-foreground mt-2">Administrative overview and quick stats.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>Pending Approvals (placeholder)</Card>
        <Card>Active Bookings (placeholder)</Card>
        <Card>Penalties (placeholder)</Card>
      </div>
    </div>
  );
}
