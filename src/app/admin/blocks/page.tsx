import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { blocks, resources } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function AdminBlocks() {
  const db = getDb();

  const blockRows = await db
    .select({
      id: blocks.id,
      startAt: blocks.startAt,
      endAt: blocks.endAt,
      reason: blocks.reason,
      resourceName: resources.name,
    })
    .from(blocks)
    .leftJoin(resources, eq(blocks.resourceId, resources.id))
    .orderBy(desc(blocks.startAt));

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">Blocks</h2>
      <p className="text-sm text-muted-foreground mt-2">Create and manage blocks (closed times).</p>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Blocked times</CardTitle>
            <CardDescription>Admin-managed resource closures seeded for verification.</CardDescription>
          </CardHeader>
          <CardContent>
            {blockRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No blocks found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th className="px-3 py-2">Resource</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {blockRows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.resourceName ?? 'Resource #'}</TableCell>
                      <TableCell>{formatDateTime(b.startAt)}</TableCell>
                      <TableCell>{formatDateTime(b.endAt)}</TableCell>
                      <TableCell>{b.reason ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
