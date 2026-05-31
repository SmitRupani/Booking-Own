import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';

export default function AdminBookings() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">All Bookings</h2>
      <p className="text-sm text-muted-foreground mt-2">View and manage bookings across the system.</p>

      <div className="mt-6">
        <Card>
          <Table>
            <tbody>
              <tr>
                <td>Booking placeholders</td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
