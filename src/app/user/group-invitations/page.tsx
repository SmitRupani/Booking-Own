import Card from '@/components/ui/Card';

export default function GroupInvitesPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Group Invitations</h2>
      <p className="text-sm text-muted-foreground mt-2">Manage invitations to group bookings.</p>

      <div className="mt-6">
        <Card>No group invitations yet.</Card>
      </div>
    </div>
  );
}
