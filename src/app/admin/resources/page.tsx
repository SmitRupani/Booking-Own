'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DoorOpen,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Resource {
  id: number;
  name: string;
  category: 'facility' | 'room' | 'equipment';
  location?: string;
  capacity?: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
}

interface EquipmentItem {
  id: number;
  resourceId: number;
  name: string;
  qtyTotal: number;
  qtyAvailable: number;
  safety?: boolean;
  requiresApproval?: boolean;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'spaces' | 'equipment'>('spaces');
  const [error, setError] = useState('');

  // Resource Modal
  const [resModalOpen, setResModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resForm, setResForm] = useState({
    name: '',
    category: 'facility',
    location: '',
    capacity: '10',
    status: 'ACTIVE',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, eqRes] = await Promise.all([
        fetch('/api/resources'),
        fetch('/api/admin/equipment'),
      ]);

      if (resRes.ok) {
        const data = await resRes.json();
        setResources(data.resources || []);
      }

      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipment(eqData.items || []);
      }
    } catch {
      setError('Failed to load campus resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: resForm.name,
        category: resForm.category,
        location: resForm.location,
        capacity: Number(resForm.capacity) || 1,
        status: resForm.status,
      };

      const res = await fetch('/api/resources', {
        method: editingResource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingResource ? { ...payload, id: editingResource.id } : payload
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save resource');
        return;
      }

      setResModalOpen(false);
      setEditingResource(null);
      setResForm({
        name: '',
        category: 'facility',
        location: '',
        capacity: '10',
        status: 'ACTIVE',
      });
      fetchData();
    } catch {
      setError('An error occurred saving resource.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin Management</Badge>
            <Badge variant="success">{resources.length} Spaces</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Resource & Gear Directory</h1>
          <p className="text-sm text-muted-foreground">
            Configure sports facilities, study rooms, equipment stock levels, and operating windows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingResource(null);
              setResForm({
                name: '',
                category: 'facility',
                location: '',
                capacity: '10',
                status: 'ACTIVE',
              });
              setResModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="spaces">Spaces ({resources.length})</TabsTrigger>
          <TabsTrigger value="equipment">Gear Stock ({equipment.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="spaces" className="mt-6">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse">
              Loading resources...
            </div>
          ) : resources.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              <p className="text-sm">No campus spaces configured yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((res) => (
                <Card key={res.id} className="border hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">
                        {res.category === 'facility' ? '🏟️' : '🚪'}
                      </span>
                      <Badge variant={res.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {res.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{res.name}</CardTitle>
                    <CardDescription className="text-xs uppercase font-semibold text-primary">
                      {res.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-muted-foreground">
                    {res.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {res.location}
                      </div>
                    )}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span>Capacity: {res.capacity} People</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingResource(res);
                          setResForm({
                            name: res.name,
                            category: res.category,
                            location: res.location || '',
                            capacity: String(res.capacity || 10),
                            status: res.status,
                          });
                          setResModalOpen(true);
                        }}
                        className="h-7 px-2 gap-1 text-xs"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse">
              Loading equipment inventory...
            </div>
          ) : equipment.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              <p className="text-sm">No gear items found.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {equipment.map((item) => (
                <Card key={item.id} className="border hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Package className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary">
                        {item.qtyAvailable} / {item.qtyTotal} Available
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>Total Inventory: {item.qtyTotal}</p>
                    <p>Currently In Stock: {item.qtyAvailable}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Resource Modal */}
      <Modal
        isOpen={resModalOpen}
        onClose={() => setResModalOpen(false)}
        title={editingResource ? 'Edit Resource' : 'Add Campus Resource'}
      >
        <form onSubmit={handleSaveResource} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Resource Name:</label>
            <Input
              type="text"
              value={resForm.name}
              onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
              placeholder="e.g. Badminton Court 1, Conference Room A"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Category:</label>
              <select
                value={resForm.category}
                onChange={(e) => setResForm({ ...resForm, category: e.target.value as any })}
                className="w-full h-10 px-3 mt-1 rounded-md border bg-background text-sm"
              >
                <option value="facility">Facility</option>
                <option value="room">Room</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Capacity:</label>
              <Input
                type="number"
                value={resForm.capacity}
                onChange={(e) => setResForm({ ...resForm, capacity: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Location:</label>
            <Input
              type="text"
              value={resForm.location}
              onChange={(e) => setResForm({ ...resForm, location: e.target.value })}
              placeholder="e.g. Ground Floor, Sports Complex"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Status:</label>
            <select
              value={resForm.status}
              onChange={(e) => setResForm({ ...resForm, status: e.target.value as any })}
              className="w-full h-10 px-3 mt-1 rounded-md border bg-background text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={() => setResModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-1/2">
              Save Resource
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
