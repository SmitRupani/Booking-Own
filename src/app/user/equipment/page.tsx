'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Trophy,
  FlaskConical,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { POLICIES } from '@/lib/policies-constants';
import { getMaxQuantityForItem } from '@/lib/sportEquipmentKits';

interface EquipmentItem {
  id: number;
  resourceId: number;
  name: string;
  description?: string;
  qtyTotal: number;
  qtyAvailable: number;
  requiresApproval?: boolean;
  safety?: boolean;
  sportCategory?: string;
  labCategory?: string;
}

export default function EquipmentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'sports' | 'lab'>('sports');
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [labDurationDays, setLabDurationDays] = useState(1);
  const [borrowReason, setBorrowReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/admin/equipment');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      setError('Failed to load equipment catalog');
    } finally {
      setFetching(false);
    }
  };

  const sportsItems = items.filter((item) => !item.labCategory);
  const labItems = items.filter((item) => !!item.labCategory);
  const currentTabItems = tab === 'sports' ? sportsItems : labItems;

  const totalSelectedCount = Object.values(selectedItems).reduce(
    (acc, q) => acc + q,
    0
  );

  const handleIncrement = (item: EquipmentItem) => {
    const current = selectedItems[item.id] || 0;
    const maxPolicy = item.sportCategory
      ? getMaxQuantityForItem(item.name, item.sportCategory as any)
      : 2;
    const available = item.qtyAvailable;
    const maxAllowed = Math.min(maxPolicy, available);

    if (current < maxAllowed) {
      setSelectedItems({ ...selectedItems, [item.id]: current + 1 });
    }
  };

  const handleDecrement = (item: EquipmentItem) => {
    const current = selectedItems[item.id] || 0;
    if (current > 1) {
      setSelectedItems({ ...selectedItems, [item.id]: current - 1 });
    } else {
      const copy = { ...selectedItems };
      delete copy[item.id];
      setSelectedItems(copy);
    }
  };

  const handleCheckout = async () => {
    const selectedList = Object.entries(selectedItems)
      .map(([idStr, qty]) => {
        const item = items.find((it) => it.id === Number(idStr));
        return item ? { itemId: String(item.id), name: item.name, qty } : null;
      })
      .filter(Boolean) as { itemId: string; name: string; qty: number }[];

    if (selectedList.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const end = new Date(now);

      if (tab === 'sports') {
        end.setHours(end.getHours() + 2); // 2-hour default sports loan
      } else {
        end.setDate(end.getDate() + labDurationDays);
      }

      // First resource as container
      const firstItem = items.find((it) => selectedItems[it.id] > 0);
      const resourceId = firstItem?.resourceId || 1;

      const payload = {
        resourceId,
        kind: 'EQUIPMENT',
        start: now.toISOString(),
        end: end.toISOString(),
        items: selectedList,
        borrowReason: borrowReason.trim() || undefined,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reserve equipment');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/user/bookings');
      }, 1500);
    } catch {
      setError('An error occurred while reserving equipment.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 inline-block mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Equipment Reserved!</h2>
        <p className="text-sm text-muted-foreground">
          Your pickup QR code is ready in your bookings dashboard. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 pb-24">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Gear Catalog</Badge>
          <Badge variant="success">{items.length} Items Listed</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Borrow Sports & Lab Equipment</h1>
        <p className="text-sm text-muted-foreground">
          Select equipment items, review safety guidelines, and generate an instant pickup QR code.
        </p>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelectedItems({}); }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sports" className="gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            Sports Gear
          </TabsTrigger>
          <TabsTrigger value="lab" className="gap-2">
            <FlaskConical className="w-4 h-4 text-blue-400" />
            Lab Equipment
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fetching ? (
            <div className="col-span-full py-12 text-center text-muted-foreground animate-pulse">
              Loading available equipment...
            </div>
          ) : currentTabItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl bg-card/40">
              No items currently listed in this category.
            </div>
          ) : (
            currentTabItems.map((item) => {
              const qtySelected = selectedItems[item.id] || 0;
              const isAvailable = item.qtyAvailable > 0;

              return (
                <Card
                  key={item.id}
                  className={`border transition-all ${
                    qtySelected > 0
                      ? 'border-primary shadow-md bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">
                        {tab === 'sports' ? '🎾' : '🔬'}
                      </span>
                      <Badge variant={isAvailable ? 'success' : 'destructive'}>
                        {isAvailable ? `${item.qtyAvailable} Available` : 'Out of Stock'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{item.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {item.description || (item.sportCategory ? `${item.sportCategory} gear` : 'Lab equipment')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.safety && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Safety instructions apply
                      </div>
                    )}
                    {item.requiresApproval && (
                      <div className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                        <Clock className="w-3.5 h-3.5" />
                        Requires faculty approval
                      </div>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!qtySelected}
                          onClick={() => handleDecrement(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-6 text-center font-bold text-sm">
                          {qtySelected}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!isAvailable}
                          onClick={() => handleIncrement(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Tabs>

      {/* Lab Duration & Reason when in Lab tab */}
      {tab === 'lab' && totalSelectedCount > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-base">Lab Borrowing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Loan Duration (Days):
              </label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 5, 7].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={labDurationDays === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabDurationDays(d)}
                  >
                    {d} {d === 1 ? 'Day' : 'Days'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Project / Coursework Reason:
              </label>
              <Input
                type="text"
                value={borrowReason}
                onChange={(e) => setBorrowReason(e.target.value)}
                placeholder="e.g. Embedded systems lab assignment"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Cart & Checkout Bar */}
      {totalSelectedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
          <div className="rounded-2xl border bg-card/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {totalSelectedCount} {totalSelectedCount === 1 ? 'Item' : 'Items'} Selected
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready for instant reservation
                </p>
              </div>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="gap-2 font-semibold"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Reserving...' : 'Reserve Now'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
