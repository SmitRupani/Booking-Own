import Table, { TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { auditLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function AdminAuditLogs() {
  const db = getDb();

  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div>
        <h2 className="text-2xl font-semibold">Audit Logs</h2>
        <p className="text-sm text-muted-foreground mt-2">Recent system audit events and activity history.</p>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <CardDescription>Showing the latest 50 seeded audit events.</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events found. Run the seed script to populate sample events.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Actor</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Target</th>
                    <th className="px-3 py-2 text-left">Message</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="font-medium">{r.actorName ?? `#${r.actorId ?? '—'}`}</TableCell>
                      <TableCell className="uppercase">{r.action}</TableCell>
                      <TableCell className="capitalize">{r.targetType ?? 'system'} {r.targetId ? `#${r.targetId}` : ''}</TableCell>
                      <TableCell className="max-w-xl truncate">{r.message}</TableCell>
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
