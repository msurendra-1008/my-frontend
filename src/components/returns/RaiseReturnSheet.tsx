import { useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import type { ReturnRequest, ReturnSettings } from '@/types/returns.types';
import { returnsService } from '@/services/returnsService';
import { cn } from '@utils/cn';

interface OrderItemShape {
  id:          string;
  product_name: string;
  variant_name: string;
  quantity:    number;
  variant_id:  string | null;
}

interface Props {
  item:       OrderItemShape;
  settings:   ReturnSettings | null;
  requestType: 'return' | 'exchange';
  onClose:    () => void;
  onCreated:  (rr: ReturnRequest) => void;
}

export function RaiseReturnSheet({ item, settings, requestType, onClose, onCreated }: Props) {
  const predefined = settings?.predefined_reasons ?? [];

  const [reason,  setReason]  = useState('');
  const [custom,  setCustom]  = useState('');
  const [notes,   setNotes]   = useState('');
  const [photos,  setPhotos]  = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,   setError]   = useState('');

  const finalReason = reason === '__custom__' ? custom.trim() : reason;

  const handleSubmit = async () => {
    if (!finalReason) { setError('Please select or enter a reason.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await returnsService.createRequest({
        order_item_id: item.id,
        request_type:  requestType,
        return_qty:    1,
        reason:        finalReason,
        notes:         notes.trim() || undefined,
      });
      const rr = res.data;
      // Upload photos
      for (const file of photos.slice(0, 3)) {
        try { await returnsService.uploadPhoto(rr.id, file); } catch { /* best-effort */ }
      }
      onCreated(rr);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string; order_item_id?: string[] } } })
        ?.response?.data;
      setError(msg?.detail ?? msg?.order_item_id?.[0] ?? 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {requestType === 'return' ? 'Request Return' : 'Request Exchange'} — {item.product_name}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              {predefined.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-purple-600"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="__custom__"
                  checked={reason === '__custom__'}
                  onChange={() => setReason('__custom__')}
                  className="accent-purple-600"
                />
                <span className="text-sm text-muted-foreground">Other…</span>
              </label>
            </div>
            {reason === '__custom__' && (
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Describe reason…"
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional details…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className={cn(
              'flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors',
              photos.length >= 3 && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}>
              <ImagePlus size={14} />
              Attach photos ({photos.length}/3)
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={photos.length >= 3}
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []).slice(0, 3 - photos.length);
                  setPhotos((prev) => [...prev, ...picked].slice(0, 3));
                }}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {photos.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-5 py-4 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : `Submit ${requestType === 'return' ? 'Return' : 'Exchange'}`}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
