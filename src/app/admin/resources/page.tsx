import Card from '@/components/ui/Card';
import Table, { TableHeader, TableRow } from '@/components/ui/Table';

export default function AdminResources() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">Resources</h2>
      <p className="text-sm text-muted-foreground mt-2">Manage physical resources and categories.</p>

      <div className="mt-6">
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <th>Name</th>
                <th>Capacity</th>
                <th>Type</th>
              </tr>
            </TableHeader>
            <tbody>
              <TableRow>
                <td>Placeholder</td>
                <td>1</td>
                <td>Ground</td>
              </TableRow>
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
