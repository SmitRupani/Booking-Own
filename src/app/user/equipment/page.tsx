import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardDescription, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function splitEquipment(rows: Array<{ id: number; name: string; category: string; capacity: number }>) {
  const labEquipment = rows.filter((row) => row.name.toLowerCase().includes('lab'));
  const sportsEquipment = rows.filter((row) => !row.name.toLowerCase().includes('lab'));

  return { sportsEquipment, labEquipment };
}

export default async function EquipmentPage() {
  const db = getDb();
  const equipmentRows = await db.select().from(resources).where(eq(resources.category, 'equipment')).orderBy(asc(resources.id));
  const { sportsEquipment, labEquipment } = splitEquipment(equipmentRows);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="success">Equipment</Badge>
          <Badge variant="secondary">Live data</Badge>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Borrow equipment</h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          This keeps the source app&apos;s sports and lab split, but uses a lightweight shadcn inventory view instead of the animation-heavy booking shell.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total items" value={equipmentRows.length} emoji="🎒" />
        <StatCard label="Sports items" value={sportsEquipment.length} emoji="🏸" />
        <StatCard label="Lab items" value={labEquipment.length} emoji="🔬" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Sports inventory</CardDescription>
            <CardTitle>Items for quick borrowing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sportsEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sports equipment is seeded yet.</p>
            ) : (
              sportsEquipment.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">Ready for same-day pickup</p>
                    </div>
                    <Badge variant="info">Qty {item.capacity}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Lab inventory</CardDescription>
            <CardTitle>Items that need a reason or longer return window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {labEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lab equipment is seeded yet.</p>
            ) : (
              labEquipment.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">Approval may be required</p>
                    </div>
                    <Badge variant="warning">Qty {item.capacity}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Borrowing notes</CardDescription>
          <CardTitle>How to verify this route</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-lg border p-4">Sports inventory should stay quick and simple.</div>
          <div className="rounded-lg border p-4">Lab inventory should be visually separated from sports items.</div>
          <div className="rounded-lg border p-4">The page stays lightweight and avoids flashy motion.</div>
        </CardContent>
      </Card>
    </div>
  );
}
