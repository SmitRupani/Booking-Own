import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminResources() {
  const db = getDb();
  const rows = await db.select().from(resources).orderBy(asc(resources.id));
  const facilityCount = rows.filter((row) => row.category === 'facility').length;
  const roomCount = rows.filter((row) => row.category === 'room').length;
  const equipmentCount = rows.filter((row) => row.category === 'equipment').length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="info">Admin resources</Badge>
          <Badge variant="secondary">Live data</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Resources</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">Manage physical resources and categories in a compact shadcn table view.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Facilities" value={facilityCount} emoji="🏟️" />
        <StatCard label="Rooms" value={roomCount} emoji="🚪" />
        <StatCard label="Equipment" value={equipmentCount} emoji="🎒" />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardDescription>Inventory snapshot</CardDescription>
            <CardTitle>All live resources</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Admin note</CardDescription>
          <CardTitle>Keep the inventory readable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This view is intentionally low-motion and table-driven so the admin workflow stays fast to load.
        </CardContent>
      </Card>
    </div>
  );
}
