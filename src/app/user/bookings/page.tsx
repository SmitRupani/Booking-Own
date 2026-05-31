import Card from '@/components/ui/Card';
import Table, { TableHeader, TableRow } from '@/components/ui/Table';

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">My Bookings</h2>
      <p className="text-sm text-muted-foreground mt-2">Your upcoming and past bookings.</p>

      <div className="mt-6">
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <th>Resource</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
              </tr>
            </TableHeader>
            <tbody>
              <TableRow>
                <td>Placeholder</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </TableRow>
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
