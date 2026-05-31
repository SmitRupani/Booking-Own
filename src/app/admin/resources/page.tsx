import Card from '@/components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminResources() {
  const db = getDb();
  const rows = await db.select().from(resources).orderBy(asc(resources.id));

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">Resources</h2>
      <p className="text-sm text-muted-foreground mt-2">Manage physical resources and categories.</p>

      <div className="mt-6">
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Category</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Capacity</th>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-3 py-6 text-sm text-muted-foreground">
                    No resources found. Seed the database to see live rows here.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell className="capitalize">{resource.category}</TableCell>
                    <TableCell>{resource.capacity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
