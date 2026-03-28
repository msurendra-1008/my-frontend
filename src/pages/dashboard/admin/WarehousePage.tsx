import { useState, useEffect, useCallback } from 'react';
import { Menu, Warehouse as WarehouseIcon, MapPin, Layers } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { warehouseService } from '@/services/warehouseService';
import { cn } from '@utils/cn';
import type { Warehouse, Zone, Rack } from '@/types/warehouse.types';

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-background shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Tab: Warehouses ───────────────────────────────────────────────────────────

function WarehousesTab() {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });
  const [saving, setSaving] = useState(false);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseService.getWarehouses();
      setItems(res.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((w) =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.location.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await warehouseService.createWarehouse({ name: form.name, location: form.location });
      show('Warehouse created.');
      setShowCreate(false);
      setForm({ name: '', location: '' });
      load();
    } catch {
      show('Failed to create warehouse.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {msg && (
        <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}
      <div className="mb-4">
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search warehouses…"
          filters={[]}
          resultCount={{ showing: filtered.length, total: items.length, label: 'warehouses' }}
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ New Warehouse</Button>}
        />
      </div>

      {showCreate && (
        <Modal title="New Warehouse" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Main Warehouse"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Delhi, India"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <WarehouseIcon className="mx-auto mb-2 h-10 w-10 opacity-30" />
            No warehouses found.
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  {w.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />{w.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{w.zone_count} zone{w.zone_count !== 1 ? 's' : ''}</span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', w.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40' : 'bg-muted/50 text-muted-foreground border-muted')}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Zones ────────────────────────────────────────────────────────────────

function ZonesTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ warehouse: '', name: '' });
  const [saving, setSaving] = useState(false);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      const res = await warehouseService.getZones(params);
      setItems(res.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((z) =>
    !search || z.name.toLowerCase().includes(search.toLowerCase()) || z.warehouse_name.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async () => {
    if (!form.warehouse || !form.name.trim()) return;
    setSaving(true);
    try {
      await warehouseService.createZone({ warehouse: form.warehouse, name: form.name });
      show('Zone created.');
      setShowCreate(false);
      setForm({ warehouse: '', name: '' });
      load();
    } catch {
      show('Failed to create zone.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {msg && (
        <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}
      <div className="mb-4">
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search zones…"
          filters={[
            {
              id: 'warehouse',
              placeholder: 'Warehouse',
              value: warehouseFilter,
              onChange: setWarehouseFilter,
              options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            },
          ]}
          resultCount={{ showing: filtered.length, total: items.length, label: 'zones' }}
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ New Zone</Button>}
        />
      </div>

      {showCreate && (
        <Modal title="New Zone" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Warehouse</label>
              <select
                value={form.warehouse}
                onChange={(e) => setForm((p) => ({ ...p, warehouse: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Zone Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Zone A"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.warehouse || !form.name.trim()}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Layers className="mx-auto mb-2 h-10 w-10 opacity-30" />
            No zones found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-5 pr-4 pt-4">Zone Name</th>
                  <th className="pb-3 pr-4 pt-4">Warehouse</th>
                  <th className="pb-3 pr-4 pt-4">Racks</th>
                  <th className="pb-3 pr-4 pt-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((z) => (
                  <tr key={z.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4 font-medium">{z.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{z.warehouse_name}</td>
                    <td className="py-3 pr-4">{z.rack_count}</td>
                    <td className="py-3 pr-4">
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', z.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40' : 'bg-muted/50 text-muted-foreground border-muted')}>
                        {z.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Racks ────────────────────────────────────────────────────────────────

function RacksTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems] = useState<Rack[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ warehouse: '', zone: '', code: '', capacity: '' });
  const [saving, setSaving] = useState(false);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      const [rRes, zRes] = await Promise.all([
        warehouseService.getRacks(params),
        warehouseService.getZones(),
      ]);
      setItems(rRes.data.results ?? []);
      setZones(zRes.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  const filteredZones = form.warehouse ? zones.filter((z) => z.warehouse === form.warehouse) : zones;

  const filtered = items.filter((r) =>
    !search || r.code.toLowerCase().includes(search.toLowerCase()) || r.zone_name.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async () => {
    if (!form.zone || !form.code.trim()) return;
    setSaving(true);
    try {
      await warehouseService.createRack({
        zone: form.zone,
        code: form.code,
        capacity: form.capacity ? parseInt(form.capacity) : 0,
      });
      show('Rack created.');
      setShowCreate(false);
      setForm({ warehouse: '', zone: '', code: '', capacity: '' });
      load();
    } catch {
      show('Failed to create rack.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {msg && (
        <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}
      <div className="mb-4">
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search racks…"
          filters={[
            {
              id: 'warehouse',
              placeholder: 'Warehouse',
              value: warehouseFilter,
              onChange: setWarehouseFilter,
              options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            },
          ]}
          resultCount={{ showing: filtered.length, total: items.length, label: 'racks' }}
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ New Rack</Button>}
        />
      </div>

      {showCreate && (
        <Modal title="New Rack" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Warehouse</label>
              <select
                value={form.warehouse}
                onChange={(e) => setForm((p) => ({ ...p, warehouse: e.target.value, zone: '' }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Zone</label>
              <select
                value={form.zone}
                onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!form.warehouse}
              >
                <option value="">Select zone…</option>
                {filteredZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Rack Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. R-01"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Capacity (units, 0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.zone || !form.code.trim()}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No racks found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-5 pr-4 pt-4">Rack Code</th>
                  <th className="pb-3 pr-4 pt-4">Zone</th>
                  <th className="pb-3 pr-4 pt-4">Warehouse</th>
                  <th className="pb-3 pr-4 pt-4">Capacity</th>
                  <th className="pb-3 pr-4 pt-4">Current Stock</th>
                  <th className="pb-3 pr-4 pt-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4 font-mono font-semibold">{r.code}</td>
                    <td className="py-3 pr-4">{r.zone_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.warehouse_name}</td>
                    <td className="py-3 pr-4">{r.capacity === 0 ? '∞' : r.capacity.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={cn('font-medium', r.capacity > 0 && r.current_stock > r.capacity ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                        {r.current_stock.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', r.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40' : 'bg-muted/50 text-muted-foreground border-muted')}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['Warehouses', 'Zones', 'Racks'] as const;
type Tab = typeof TABS[number];

export function AdminWarehousePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    warehouseService.getWarehouses().then((r) => setWarehouses(r.data.results ?? [])).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold hidden md:block">Warehouse</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Warehouse Management</h1>
            <p className="text-muted-foreground text-sm">Manage warehouses, zones, and rack locations.</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Warehouses' && <WarehousesTab />}
          {tab === 'Zones' && <ZonesTab warehouses={warehouses} />}
          {tab === 'Racks' && <RacksTab warehouses={warehouses} />}
        </main>
      </div>
    </div>
  );
}
