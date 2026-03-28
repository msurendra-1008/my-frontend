import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Package, ClipboardList } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { inspectionService } from '@/services/inspectionService';
import { cn } from '@utils/cn';
import type { IncomingShipment, InspectionSettings } from '@/types/inspection.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  awaiting_inspection: { label: 'Awaiting inspection', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-400/40' },
  completed_stocked:   { label: 'Completed',           className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/40' },
  completed_pending:   { label: 'Stock pending',        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40' },
  cancelled:           { label: 'Cancelled',             className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/40' },
};

function shipmentBadgeKey(s: IncomingShipment): string {
  if (s.status === 'awaiting_inspection') return 'awaiting_inspection';
  if (s.status === 'completed') return s.stock_updated ? 'completed_stocked' : 'completed_pending';
  return 'cancelled';
}

function ShipmentBadge({ s }: { s: IncomingShipment }) {
  const key = shipmentBadgeKey(s);
  const cfg = STATUS_CFG[key];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold', color ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

// ── Settings Sheet ────────────────────────────────────────────────────────────

function SettingsSheet({
  current, onClose, onSaved,
}: { current: InspectionSettings; onClose: () => void; onSaved: () => void }) {
  const [auto, setAuto] = useState(current.auto_stock_update);
  const [saving, setSaving] = useState(false);
  const { msg, show } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await inspectionService.updateSettings({ auto_stock_update: auto });
      show('Settings saved.');
      onSaved();
    } catch {
      show('Failed to save.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Inspection Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>{msg.text}</div>}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">Automatic stock update</p>
              <p className="text-sm text-muted-foreground mt-1">
                When enabled, stock is updated immediately after inspection is submitted.
                When disabled, admin must click "Update stock" after reviewing the report.
              </p>
            </div>
            <button
              onClick={() => setAuto((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                auto ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform', auto ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </div>
        <div className="border-t p-4">
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminInspectionPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shipments, setShipments]     = useState<IncomingShipment[]>([]);
  const [settings, setSettings]       = useState<InspectionSettings | null>(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { msg } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shRes, stRes] = await Promise.all([
        inspectionService.getShipments({
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        }),
        inspectionService.getSettings(),
      ]);
      setShipments(shRes.data.results);
      setSettings(stRes.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const awaiting = shipments.filter((s) => s.status === 'awaiting_inspection').length;
  const completedStocked = shipments.filter((s) => s.status === 'completed' && s.stock_updated).length;
  const completedPending = shipments.filter((s) => s.status === 'completed' && !s.stock_updated).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      {showSettings && settings && (
        <SettingsSheet
          current={settings}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); load(); }}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold hidden md:block">Inspection</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {msg && <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>{msg.text}</div>}

          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Inspection</h1>
            <p className="text-muted-foreground text-sm">Review and process incoming shipments.</p>
          </div>

          {/* Settings bar */}
          {settings && (
            <div className="mb-6 flex items-center justify-between rounded-xl border bg-card px-5 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Stock update:</span>
                <span className={cn('font-medium', settings.auto_stock_update ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                  {settings.auto_stock_update ? 'Auto' : 'Manual'}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>Change</Button>
            </div>
          )}

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Awaiting inspection" value={awaiting} color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Completed — stocked" value={completedStocked} color="text-green-600 dark:text-green-400" />
            <StatCard label="Completed — stock pending" value={completedPending} color="text-amber-600 dark:text-amber-400" />
            <StatCard label="Total shipments" value={shipments.length} />
          </div>

          {/* Filters */}
          <div className="mb-4">
            <FilterToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by PO number or vendor…"
              filters={[
                {
                  id: 'status',
                  placeholder: 'Status',
                  value: statusFilter,
                  options: [
                    { value: 'awaiting_inspection', label: 'Awaiting inspection' },
                    { value: 'completed',           label: 'Completed' },
                    { value: 'cancelled',           label: 'Cancelled' },
                  ],
                  onChange: setStatusFilter,
                },
              ]}
              resultCount={{ showing: shipments.length, total: shipments.length, label: 'shipments' }}
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-2 h-10 w-10 opacity-30" />
                No shipments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pl-5 pr-4 pt-4 w-10"></th>
                      <th className="pb-3 pr-4 pt-4">PO Number</th>
                      <th className="pb-3 pr-4 pt-4">Vendor</th>
                      <th className="pb-3 pr-4 pt-4">Product</th>
                      <th className="pb-3 pr-4 pt-4">Expected Qty</th>
                      <th className="pb-3 pr-4 pt-4">Status</th>
                      <th className="pb-3 pr-4 pt-4">Created</th>
                      <th className="pb-3 pr-4 pt-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shipments.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/40">
                        <td className="py-3 pl-5 pr-4">
                          {s.product_image_url ? (
                            <img src={s.product_image_url} alt="" className="h-10 w-10 rounded border object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono font-semibold">{s.po_number}</td>
                        <td className="py-3 pr-4">{s.vendor_company}</td>
                        <td className="py-3 pr-4">{s.product_name}</td>
                        <td className="py-3 pr-4">{s.expected_quantity.toLocaleString()}</td>
                        <td className="py-3 pr-4"><ShipmentBadge s={s} /></td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDate(s.created_at)}</td>
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => navigate(`/admin/inspection/${s.id}`)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {s.has_report ? 'View report →' : 'Inspect →'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
