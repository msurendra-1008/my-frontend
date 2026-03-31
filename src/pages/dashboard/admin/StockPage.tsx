import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Package, ArrowRightLeft, Plus, Pencil } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { CapacityBar } from '@/components/warehouse/CapacityBar';
import { warehouseService } from '@/services/warehouseService';
import { cn } from '@utils/cn';
import type {
  RackStock, StockMovement, StockTransfer,
  MovementType, Warehouse, Zone, Rack, ProductVariantLite,
} from '@/types/warehouse.types';
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

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

// ── Right-side Sheet (drawer) ─────────────────────────────────────────────────

function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, saving }: {
  message: React.ReactNode; onConfirm: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-3 font-semibold">Confirm adjustment</h3>
        <div className="mb-5 text-sm text-muted-foreground">{message}</div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={saving}>
            {saving ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Adjust Sheet (existing rack stock entry) ──────────────────────────────────

function AdjustSheet({ item, onClose, onSuccess }: {
  item: RackStock | null; onClose: () => void; onSuccess: () => void;
}) {
  const [adjType, setAdjType]   = useState<'add' | 'remove'>('add');
  const [qty, setQty]           = useState('');
  const [reason, setReason]     = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const { msg, show } = useToast();

  // Reset form when item changes
  useEffect(() => {
    setAdjType('add');
    setQty('');
    setReason('');
    setError('');
    setConfirming(false);
  }, [item?.id]);

  if (!item) return null;

  const qtyNum    = parseInt(qty) || 0;
  const newQty    = adjType === 'add' ? item.quantity + qtyNum : item.quantity - qtyNum;
  const canSubmit = qtyNum > 0 && reason.trim().length >= 10 && newQty >= 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (adjType === 'remove' && qtyNum > item.quantity) {
      setError(`Cannot remove more than current stock (${item.quantity} units).`);
      return;
    }
    setError('');
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await warehouseService.manualAdjust({
        rack: item.rack,
        variant: item.variant,
        adjustment_type: adjType,
        quantity: qtyNum,
        reason: reason.trim(),
      });
      show('Stock adjusted successfully.');
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      const msg = e?.response?.data?.error || e?.response?.data?.detail || 'Something went wrong';
      show(msg, true);
      setError(msg);
      setConfirming(false);
      console.log('DONE: capacity error toast');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open title="Manual Stock Adjustment" onClose={onClose}>
      {confirming && (
        <ConfirmDialog
          message={
            <span>
              {adjType === 'add' ? 'Add' : 'Remove'}{' '}
              <strong>{qtyNum.toLocaleString()} units</strong>{' '}
              {adjType === 'add' ? 'to' : 'from'} rack{' '}
              <strong>{item.rack_code}</strong>?<br />
              New total: <strong>{newQty.toLocaleString()} units</strong>
            </span>
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          saving={saving}
        />
      )}

      {msg && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}

      {/* Read-only info */}
      <div className="mb-5 rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Product</span>
          <span className="font-medium text-right max-w-[60%]">{item.product_name} — {item.variant_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="font-mono text-xs">{item.warehouse_name} / {item.zone_name} / {item.rack_code}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current qty</span>
          <span className="font-semibold">{item.quantity.toLocaleString()} units</span>
        </div>
      </div>

      {/* Adjustment type */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium">Adjustment type</p>
        <div className="flex gap-4">
          {(['add', 'remove'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="adjType"
                value={t}
                checked={adjType === t}
                onChange={() => { setAdjType(t); setQty(''); setError(''); }}
                className="accent-primary"
              />
              <span className={adjType === t ? 'font-medium' : 'text-muted-foreground'}>
                {t === 'add' ? 'Add stock' : 'Remove stock'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium">Quantity *</label>
        <input
          type="number"
          min={1}
          max={adjType === 'remove' ? item.quantity : undefined}
          value={qty}
          onChange={(e) => { setQty(e.target.value); setError(''); }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. 50"
        />
        {qtyNum > 0 && (
          <p className={cn('mt-1 text-xs', newQty < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            New qty will be:{' '}
            <span className="font-semibold">{Math.max(newQty, 0).toLocaleString()} units</span>
          </p>
        )}
      </div>

      {/* Reason */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium">Reason *</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Opening stock entry, damaged goods write-off, inventory correction…"
        />
        {reason.length > 0 && reason.trim().length < 10 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Min 10 characters required.</p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        Apply adjustment
      </Button>
    </Sheet>
  );
}

// ── Add Stock Sheet (no existing entry — new rack/variant combination) ─────────

function AddStockSheet({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones]           = useState<Zone[]>([]);
  const [racks, setRacks]           = useState<Rack[]>([]);
  const [selWarehouse, setSelWarehouse] = useState('');
  const [selZone, setSelZone]           = useState('');
  const [selRack, setSelRack]           = useState('');

  const [variantSearch, setVariantSearch] = useState('');
  const [variantResults, setVariantResults] = useState<ProductVariantLite[]>([]);
  const [selVariant, setSelVariant]       = useState<ProductVariantLite | null>(null);

  const [qty, setQty]       = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warehouseRef   = useRef<HTMLDivElement>(null);
  const zoneRef        = useRef<HTMLDivElement>(null);
  const rackRef        = useRef<HTMLDivElement>(null);
  const variantRef     = useRef<HTMLDivElement>(null);
  const [warehouseOpen, setWarehouseOpen]     = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [zoneOpen, setZoneOpen]               = useState(false);
  const [zoneSearch, setZoneSearch]           = useState('');
  const [rackOpen, setRackOpen]               = useState(false);
  const [rackSearch, setRackSearch]           = useState('');
  const [variantOpen, setVariantOpen]         = useState(false);
  const [currentRackQty, setCurrentRackQty]   = useState<number | null>(null);
  const [totalStock, setTotalStock]           = useState<number | null>(null);
  const { msg, show } = useToast();

  // Load warehouses once; reset combobox state on close
  useEffect(() => {
    if (!open) { setWarehouseOpen(false); setWarehouseSearch(''); return; }
    warehouseService.getWarehouses().then((r) => setWarehouses((r.data as any).results ?? r.data ?? [])).catch(() => {});
  }, [open]);

  // Click-outside closes warehouse dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (warehouseRef.current && !warehouseRef.current.contains(e.target as Node)) {
        setWarehouseOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Click-outside closes zone dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cascading zone load — reset zone combobox when warehouse changes
  useEffect(() => {
    if (!selWarehouse) { setZones([]); setSelZone(''); setZoneOpen(false); setZoneSearch(''); return; }
    warehouseService.getZones({ warehouse: selWarehouse }).then((r) => setZones((r.data as any).results ?? r.data ?? [])).catch(() => {});
    setSelZone('');
    setSelRack('');
    setZoneOpen(false);
    setZoneSearch('');
  }, [selWarehouse]);

  // Cascading rack load — reset rack combobox when zone changes
  useEffect(() => {
    if (!selZone) { setRacks([]); setSelRack(''); setRackOpen(false); setRackSearch(''); return; }
    warehouseService.getRacks({ zone: selZone }).then((r) => setRacks((r.data as any).results ?? r.data ?? [])).catch(() => {});
    setSelRack('');
    setRackOpen(false);
    setRackSearch('');
  }, [selZone]);

  // Click-outside closes rack dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rackRef.current && !rackRef.current.contains(e.target as Node)) setRackOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Click-outside closes variant dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (variantRef.current && !variantRef.current.contains(e.target as Node)) setVariantOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Variant search with debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!variantSearch.trim()) { setVariantResults([]); return; }
    searchTimer.current = setTimeout(() => {
      warehouseService.searchVariants(variantSearch).then((r) => setVariantResults(r.data)).catch(() => {});
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [variantSearch]);

  // Fetch stock for selected variant — update whenever variant or rack changes
  useEffect(() => {
    if (!selVariant) { setCurrentRackQty(null); setTotalStock(null); return; }
    warehouseService.getStock({ variant: selVariant.id }).then((r) => {
      const entries: RackStock[] = (r.data as any).results ?? r.data ?? [];
      const total = entries.reduce((sum, e) => sum + e.quantity, 0);
      const inRack = entries.find((e) => e.rack === selRack)?.quantity ?? 0;
      setTotalStock(total);
      setCurrentRackQty(selRack ? inRack : null);
    }).catch(() => {});
  }, [selVariant?.id, selRack]);

  const selectedRack = racks.find((r) => r.id === selRack) ?? null;
  const qtyNum       = parseInt(qty) || 0;
  const canSubmit    = selRack && selVariant && qtyNum > 0 && reason.trim().length >= 10;

  const handleConfirm = async () => {
    if (!selVariant) return;
    setSaving(true);
    try {
      await warehouseService.manualAdjust({
        rack: selRack,
        variant: selVariant.id,
        adjustment_type: 'add',
        quantity: qtyNum,
        reason: reason.trim(),
      });
      show('Stock added successfully.');
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      const msg = e?.response?.data?.error || e?.response?.data?.detail || 'Something went wrong';
      show(msg, true);
      setError(msg);
      setConfirming(false);
      console.log('DONE: capacity error toast');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} title="Add Stock to Rack" onClose={onClose}>
      {confirming && selVariant && (
        <ConfirmDialog
          message={
            <span>
              Add <strong>{qtyNum.toLocaleString()} units</strong> of{' '}
              <strong>{selVariant.product_name} — {selVariant.name}</strong>{' '}
              to rack <strong>{selectedRack?.code}</strong>?
            </span>
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          saving={saving}
        />
      )}

      {msg && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}

      {/* Cascading location selects */}
      <div className="mb-5 space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">Location</p>
        <div>
          <label className="text-sm font-medium">Warehouse *</label>
          {(() => {
            const selected = warehouses.find((w) => w.id === selWarehouse) ?? null;
            const filtered = warehouses.filter((w) =>
              !warehouseSearch.trim() ||
              w.name.toLowerCase().includes(warehouseSearch.toLowerCase())
            );
            return (
              <div ref={warehouseRef} className="relative mt-1">
                <input
                  value={warehouseOpen ? warehouseSearch : (selected?.name ?? '')}
                  placeholder="Search warehouse…"
                  onFocus={() => { setWarehouseOpen(true); setWarehouseSearch(''); }}
                  onChange={(e) => setWarehouseSearch(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {warehouseOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No warehouses found.</div>
                    ) : (
                      filtered.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          className={cn('block w-full px-3 py-2 text-left text-sm hover:bg-muted/60', selWarehouse === w.id && 'bg-muted/40 font-medium')}
                          onClick={() => {
                            setSelWarehouse(w.id);
                            setSelZone('');
                            setSelRack('');
                            setZones([]);
                            setRacks([]);
                            setWarehouseOpen(false);
                            setWarehouseSearch('');
                            console.log('DONE: warehouse combobox');
                          }}
                        >
                          {w.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div>
          <label className={cn('text-sm font-medium', !selWarehouse && 'text-muted-foreground')}>Zone *</label>
          {(() => {
            const selected = zones.find((z) => z.id === selZone) ?? null;
            const filtered = zones.filter((z) =>
              !zoneSearch.trim() ||
              z.name.toLowerCase().includes(zoneSearch.toLowerCase())
            );
            return (
              <div ref={zoneRef} className="relative mt-1">
                <input
                  disabled={!selWarehouse}
                  value={zoneOpen ? zoneSearch : (selected?.name ?? '')}
                  placeholder={selWarehouse ? 'Search zone…' : 'Select warehouse first'}
                  onFocus={() => { if (selWarehouse) { setZoneOpen(true); setZoneSearch(''); } }}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {zoneOpen && selWarehouse && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No zones found.</div>
                    ) : (
                      filtered.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                          className={cn('block w-full px-3 py-2 text-left text-sm hover:bg-muted/60', selZone === z.id && 'bg-muted/40 font-medium')}
                          onClick={() => {
                            setSelZone(z.id);
                            setSelRack('');
                            setRacks([]);
                            setZoneOpen(false);
                            setZoneSearch('');
                            console.log('DONE: zone combobox');
                          }}
                        >
                          {z.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div>
          <label className={cn('text-sm font-medium', !selZone && 'text-muted-foreground')}>Rack *</label>
          {(() => {
            const selected = racks.find((r) => r.id === selRack) ?? null;
            const filtered = racks.filter((r) =>
              !rackSearch.trim() ||
              r.code.toLowerCase().includes(rackSearch.toLowerCase())
            );
            const displayVal = selected
              ? `${selected.code} — ${selected.capacity === 0 ? '∞' : `${selected.current_stock}/${selected.capacity}`} units`
              : '';
            return (
              <div ref={rackRef} className="relative mt-1">
                <input
                  disabled={!selZone}
                  value={rackOpen ? rackSearch : displayVal}
                  placeholder={selZone ? 'Search rack…' : 'Select zone first'}
                  onFocus={() => { if (selZone) { setRackOpen(true); setRackSearch(''); } }}
                  onChange={(e) => setRackSearch(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {rackOpen && selZone && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No racks found.</div>
                    ) : (
                      filtered.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={cn('block w-full px-3 py-2 text-left text-sm hover:bg-muted/60', selRack === r.id && 'bg-muted/40')}
                          onClick={() => {
                            setSelRack(r.id);
                            setRackOpen(false);
                            setRackSearch('');
                            console.log('DONE: rack + variant combobox');
                          }}
                        >
                          <div className={cn('font-medium', selRack === r.id && 'text-primary')}>
                            {r.code} — {r.capacity === 0 ? '∞' : `${r.current_stock}/${r.capacity}`} units
                          </div>
                          {r.capacity > 0 && (
                            <div className="mt-1">
                              <CapacityBar current={r.current_stock} max={r.capacity} />
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {selectedRack && !rackOpen && (
            <div className="mt-2">
              <CapacityBar current={selectedRack.current_stock} max={selectedRack.capacity} />
            </div>
          )}
        </div>
      </div>

      {/* Variant combobox */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium">Product / Variant *</label>
        {selVariant ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-sm">
              <p className="font-medium">{selVariant.product_name}</p>
              <p className="text-xs text-muted-foreground">{selVariant.name} · {selVariant.sku}</p>
            </div>
            <button
              onClick={() => {
                setSelVariant(null);
                setVariantSearch('');
                setVariantResults([]);
                setCurrentRackQty(null);
                setTotalStock(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              Change
            </button>
          </div>
        ) : (
          <div ref={variantRef} className="relative">
            <input
              value={variantSearch}
              onFocus={() => setVariantOpen(true)}
              onChange={(e) => { setVariantSearch(e.target.value); setVariantOpen(true); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search by product name or SKU…"
            />
            {variantOpen && variantResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-background shadow-lg">
                {variantResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelVariant(v);
                      setVariantSearch('');
                      setVariantResults([]);
                      setVariantOpen(false);
                      console.log('DONE: rack + variant combobox');
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 flex justify-between"
                  >
                    <span>
                      <span className="font-medium">{v.product_name}</span>
                      <span className="text-muted-foreground"> — {v.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{v.sku}</span>
                  </button>
                ))}
              </div>
            )}
            {variantOpen && variantSearch.trim() && variantResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-background shadow-lg px-3 py-2 text-xs text-muted-foreground">
                No results for "{variantSearch}"
              </div>
            )}
          </div>
        )}
        {selVariant && (
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {totalStock !== null && (
              <p>Total stock: <span className="font-medium text-foreground">{totalStock} units</span></p>
            )}
            {totalStock !== null && selRack && (
              <p>In selected rack: <span className="font-medium text-foreground">{currentRackQty ?? 0} units</span></p>
            )}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium">Quantity *</label>
        <input
          type="number"
          min={1}
          max={selectedRack && selectedRack.capacity > 0 ? Math.max(0, selectedRack.capacity - selectedRack.current_stock) : undefined}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. 100"
        />
        {selRack && selVariant && selectedRack && (
          <p className="mt-1 text-xs text-muted-foreground">
            Space available:{' '}
            <span className="font-medium text-foreground">
              {selectedRack.capacity === 0
                ? 'No limit'
                : `${Math.max(0, selectedRack.capacity - selectedRack.current_stock)} units`}
            </span>
          </p>
        )}
      </div>

      {/* Reason */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium">Reason *</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Opening stock entry, inventory correction…"
        />
        {reason.length > 0 && reason.trim().length < 10 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Min 10 characters required.</p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <Button onClick={() => setConfirming(true)} disabled={!canSubmit} className="w-full">
        Add stock
      </Button>
    </Sheet>
  );
}

// ── Tab: Stock Levels ─────────────────────────────────────────────────────────

function StockLevelsTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems]         = useState<RackStock[]>([]);
  const [loading, setLoading]     = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [adjustItem, setAdjustItem] = useState<RackStock | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { msg } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (search) params.search = search;
      const res = await warehouseService.getStock(params);
      setItems((res.data as any).results ?? res.data ?? []);
      console.log('DONE: stock table fix', (res.data as any).results ?? res.data);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {msg && (
        <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>
          {msg.text}
        </div>
      )}

      <AdjustSheet item={adjustItem} onClose={() => setAdjustItem(null)} onSuccess={load} />
      <AddStockSheet open={showAddSheet} onClose={() => setShowAddSheet(false)} onSuccess={load} />

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
          actions={
            <Button size="sm" onClick={() => setShowAddSheet(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add stock to rack
            </Button>
          }
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
                  <th className="pb-3 pr-4 pt-4">Warehouse</th>
                  <th className="pb-3 pr-4 pt-4">Quantity</th>
                  <th className="pb-3 pr-4 pt-4">Last Updated</th>
                  <th className="pb-3 pr-4 pt-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="py-3 pl-5 pr-4" style={{ width: '64px' }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0" style={{ minWidth: '48px', minHeight: '48px' }}>
                        {s.product_image ? (
                          <img src={s.product_image} alt="" className="w-full h-full"
                            style={{ objectFit: 'cover', display: 'block' }}
                            onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }} />
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
                    <td className="py-3 pr-4">
                      <p className="font-mono font-semibold">{s.rack_code}</p>
                      <p className="text-xs text-muted-foreground">{s.zone_name}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-sm">{s.warehouse_name}</td>
                    <td className="py-3 pr-4 font-semibold">{s.quantity.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(s.last_updated)}</td>
                    <td className="py-3 pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdjustItem(s)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="mr-1 h-3 w-3" />Adjust
                      </Button>
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

// ── Tab: Movements ────────────────────────────────────────────────────────────

function MovementsTab({ warehouses }: { warehouses: Warehouse[] }) {
  const [items, setItems]   = useState<StockMovement[]>([]);
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
      setItems((res.data as any).results ?? res.data ?? []);
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
      .then((r) => setItems((r.data as any).results ?? r.data ?? []))
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
    warehouseService.getWarehouses().then((r) => setWarehouses((r.data as any).results ?? r.data ?? [])).catch(() => {});
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

          {tab === 'Stock Levels' && <StockLevelsTab warehouses={warehouses} />}
          {tab === 'Movements'    && <MovementsTab warehouses={warehouses} />}
          {tab === 'Transfers'    && <TransfersTab />}
        </main>
      </div>
    </div>
  );
}
