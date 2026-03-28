import { useState, useEffect, useCallback } from 'react';
import { Menu, Package, ArrowRightLeft } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { warehouseService } from '@/services/warehouseService';
import { cn } from '@utils/cn';
import type { RackStock, StockMovement, StockTransfer, MovementType, Warehouse } from '@/types/warehouse.types';
import { MOVEMENT_TYPE_LABELS } from '@/types/warehouse.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

const MOVEMENT_COLORS: Record<MovementType, string> = {
  inbound:      'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40',
  outbound:     'bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/40',
  transfer_in:  'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-400/40',
  transfer_out: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40',
  adjustment:   'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-400/40',
  return_in:    'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-400/40',
};

// ── Tab: Stock Levels ─────────────────────────────────────────────────────────

function StockLevelsTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems] = useState<RackStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (search) params.search = search;
      const res = await warehouseService.getStock(params);
      setItems(res.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4">
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by product name…"
          filters={[
            {
              id: 'warehouse',
              placeholder: 'Warehouse',
              value: warehouseFilter,
              onChange: setWarehouseFilter,
              options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            },
          ]}
          resultCount={{ showing: items.length, total: items.length, label: 'entries' }}
        />
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
            No stock entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-5 pr-4 pt-4" style={{ width: '64px' }}></th>
                  <th className="pb-3 pr-4 pt-4">Product</th>
                  <th className="pb-3 pr-4 pt-4">SKU</th>
                  <th className="pb-3 pr-4 pt-4">Rack</th>
                  <th className="pb-3 pr-4 pt-4">Zone</th>
                  <th className="pb-3 pr-4 pt-4">Warehouse</th>
                  <th className="pb-3 pr-4 pt-4">Quantity</th>
                  <th className="pb-3 pr-4 pt-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4" style={{ width: '64px' }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0" style={{ minWidth: '48px', minHeight: '48px' }}>
                        {s.product_image ? (
                          <img
                            src={s.product_image}
                            alt=""
                            className="w-full h-full"
                            style={{ objectFit: 'cover', display: 'block' }}
                            onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{s.product_name}</p>
                      <p className="text-muted-foreground text-xs">{s.variant_name}</p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{s.sku}</td>
                    <td className="py-3 pr-4 font-mono font-semibold">{s.rack_code}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.zone_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.warehouse_name}</td>
                    <td className="py-3 pr-4 font-semibold">{s.quantity.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(s.last_updated)}</td>
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

// ── Tab: Movements ────────────────────────────────────────────────────────────

function MovementsTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (typeFilter) params.movement_type = typeFilter;
      if (search) params.search = search;
      const res = await warehouseService.getMovements(params);
      setItems(res.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4">
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by product name…"
          filters={[
            {
              id: 'warehouse',
              placeholder: 'Warehouse',
              value: warehouseFilter,
              onChange: setWarehouseFilter,
              options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            },
            {
              id: 'type',
              placeholder: 'Movement Type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: (Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((k) => ({
                value: k, label: MOVEMENT_TYPE_LABELS[k],
              })),
              width: 'w-[160px]',
            },
          ]}
          resultCount={{ showing: items.length, total: items.length, label: 'movements' }}
        />
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No movements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-5 pr-4 pt-4">Type</th>
                  <th className="pb-3 pr-4 pt-4">Product</th>
                  <th className="pb-3 pr-4 pt-4">Rack</th>
                  <th className="pb-3 pr-4 pt-4">Warehouse</th>
                  <th className="pb-3 pr-4 pt-4">Qty</th>
                  <th className="pb-3 pr-4 pt-4">Reference</th>
                  <th className="pb-3 pr-4 pt-4">By</th>
                  <th className="pb-3 pr-4 pt-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', MOVEMENT_COLORS[m.movement_type])}>
                        {MOVEMENT_TYPE_LABELS[m.movement_type]}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{m.product_name}</p>
                      <p className="text-muted-foreground text-xs">{m.variant_name}</p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{m.rack_code}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{m.warehouse_name}</td>
                    <td className="py-3 pr-4 font-semibold">{m.quantity.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs font-mono">{m.reference || '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{m.performed_by_name || '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(m.created_at)}</td>
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

// ── Tab: Transfers ────────────────────────────────────────────────────────────

function TransfersTab() {
  const [items, setItems] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    warehouseService.getTransfers()
      .then((r) => setItems(r.data.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ArrowRightLeft className="mx-auto mb-2 h-10 w-10 opacity-30" />
            No transfers yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pl-5 pr-4 pt-4">Product</th>
                  <th className="pb-3 pr-4 pt-4">From</th>
                  <th className="pb-3 pr-4 pt-4">To</th>
                  <th className="pb-3 pr-4 pt-4">Qty</th>
                  <th className="pb-3 pr-4 pt-4">Status</th>
                  <th className="pb-3 pr-4 pt-4">By</th>
                  <th className="pb-3 pr-4 pt-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4">
                      <p className="font-medium">{t.product_name}</p>
                      <p className="text-muted-foreground text-xs">{t.variant_name}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-mono text-xs font-semibold">{t.from_rack_code}</p>
                      <p className="text-muted-foreground text-xs">{t.from_warehouse}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-mono text-xs font-semibold">{t.to_rack_code}</p>
                      <p className="text-muted-foreground text-xs">{t.to_warehouse}</p>
                    </td>
                    <td className="py-3 pr-4 font-semibold">{t.quantity.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium',
                        t.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40' :
                        t.status === 'cancelled' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/40' :
                        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40',
                      )}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{t.initiated_by_name || '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(t.created_at)}</td>
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

const TABS = ['Stock Levels', 'Movements', 'Transfers'] as const;
type Tab = typeof TABS[number];

export function AdminStockPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Stock Levels');
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
            <h1 className="text-lg font-semibold hidden md:block">Stock</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Stock Management</h1>
            <p className="text-muted-foreground text-sm">View stock levels, movements, and transfers across all warehouses.</p>
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

          {tab === 'Stock Levels'  && <StockLevelsTab warehouses={warehouses} />}
          {tab === 'Movements'     && <MovementsTab warehouses={warehouses} />}
          {tab === 'Transfers'     && <TransfersTab />}
        </main>
      </div>
    </div>
  );
}
