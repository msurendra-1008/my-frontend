import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { vendorService } from '@/services/vendorService';
import { procurementService } from '@/services/procurementService';
import type { VendorProductListItem } from '@/types/vendor.types';

interface Props {
  onClose:  () => void;
  onSaved:  (sendNow?: boolean) => void;
}

export function CreateRequirementSheet({ onClose, onSaved }: Props) {
  const [vpList, setVpList]           = useState<VendorProductListItem[]>([]);
  const [vpLoading, setVpLoading]     = useState(true);
  const [selectedVpId, setSelectedVpId] = useState('');
  const [vendorName, setVendorName]   = useState('');
  const [quantity, setQuantity]       = useState('');
  const [requiredBy, setRequiredBy]   = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    vendorService.adminListProducts({ status: 'approved' })
      .then((r) => setVpList(r.data.results))
      .finally(() => setVpLoading(false));
  }, []);

  const handleVpChange = async (vpId: string) => {
    setSelectedVpId(vpId);
    if (!vpId) { setVendorName(''); return; }
    try {
      const res = await vendorService.adminGetProduct(vpId);
      setVendorName(res.data.vendor_name);
    } catch { setVendorName(''); }
  };

  const handleSave = async (sendNow = false) => {
    setError('');
    if (!selectedVpId)  { setError('Please select a vendor product.'); return; }
    if (!quantity || Number(quantity) < 1) { setError('Required quantity must be at least 1.'); return; }
    if (!requiredBy)    { setError('Required-by date is required.'); return; }

    setSaving(true);
    try {
      const res = await procurementService.createRequirement({
        vendor_product_id: selectedVpId,
        required_quantity: Number(quantity),
        required_by_date:  requiredBy,
        target_price:      targetPrice ? targetPrice : null,
        notes,
      });
      if (sendNow) {
        await procurementService.sendRequirement(res.data.id);
      }
      onSaved(sendNow);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const data = e?.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs || 'Something went wrong.');
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Create Procurement Requirement</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Vendor Product *</label>
            {vpLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
              </div>
            ) : (
              <select
                value={selectedVpId}
                onChange={(e) => handleVpChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Select approved vendor product —</option>
                {vpList.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.name} — {vp.sku}
                  </option>
                ))}
              </select>
            )}
          </div>

          {vendorName && (
            <div>
              <label className="mb-1 block text-sm font-medium">Vendor</label>
              <Input value={vendorName} readOnly className="bg-muted/50" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Required Quantity *</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Required By Date *</label>
            <Input
              type="date"
              value={requiredBy}
              onChange={(e) => setRequiredBy(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Target Price / unit (₹) — optional</label>
            <Input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Guide price for vendor"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notes / Specifications</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Quality requirements, packaging specs, etc."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4">
          <Button onClick={() => handleSave(true)} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save &amp; Send to Vendor
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="w-full">
            Save as Draft
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
