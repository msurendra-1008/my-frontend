import { useState } from 'react';
import { ChevronDown, ChevronUp, ImagePlus, SendHorizontal } from 'lucide-react';
import type { ReturnRequest, ReturnSettings } from '@/types/returns.types';
import { returnsService } from '@/services/returnsService';
import { ReturnRequestTimeline } from './ReturnRequestTimeline';
import { cn } from '@utils/cn';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    raised:         'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    under_review:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    approved:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    rejected_final: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200',
    completed:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  const label: Record<string, string> = {
    raised:         'Raised',
    under_review:   'Under Review',
    approved:       'Approved',
    rejected:       'Rejected',
    rejected_final: 'Rejected (Final)',
    completed:      'Completed',
  };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[status] ?? 'bg-muted text-muted-foreground')}>
      {label[status] ?? status}
    </span>
  );
}

// ── Attempt badge ─────────────────────────────────────────────────────────────

function AttemptBadge({ attempt, max }: { attempt: number; max: number }) {
  const isFinal = attempt >= max;
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
      isFinal
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-muted text-muted-foreground',
    )}>
      Attempt {attempt} of {max}
    </span>
  );
}

// ── Inline reply form ─────────────────────────────────────────────────────────

function InlineReplyForm({ rr, onUpdated }: { rr: ReturnRequest; onUpdated: (r: ReturnRequest) => void }) {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState('');
  const [files,   setFiles]   = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const remaining = 3 - rr.photos.length;

  const handleSend = async () => {
    if (!text.trim()) { setError('Please enter a reply.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await returnsService.userReply(rr.id, text.trim());
      const updated = res.data;
      // Upload photos
      for (const file of files.slice(0, remaining)) {
        await returnsService.uploadPhoto(rr.id, file);
      }
      setText('');
      setFiles([]);
      setOpen(false);
      onUpdated(updated);
    } catch {
      setError('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <SendHorizontal size={13} />
        Reply to Admin
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your reply…"
        rows={3}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
      {remaining > 0 && (
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ImagePlus size={13} />
          Attach photos ({files.length}/{remaining})
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).slice(0, remaining);
              setFiles(picked);
            }}
          />
        </label>
      )}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((f, i) => (
            <img
              key={i}
              src={URL.createObjectURL(f)}
              alt=""
              className="h-12 w-12 rounded object-cover border"
            />
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
        <button
          onClick={() => { setOpen(false); setText(''); setFiles([]); setError(''); }}
          className="rounded-lg border px-3 py-2 text-xs hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface Props {
  rr:        ReturnRequest;
  settings:  ReturnSettings | null;
  onUpdated: (r: ReturnRequest) => void;
}

export function ReturnRequestCard({ rr, settings, onUpdated }: Props) {
  const [showTimeline, setShowTimeline] = useState(false);

  const maxAttempts = settings?.max_attempts ?? 2;
  const isRejectedFinal = rr.status === 'rejected_final';
  const isRejected      = rr.status === 'rejected' || isRejectedFinal;
  const needsReply      = rr.status === 'under_review' && rr.waiting_for === 'user';

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{rr.order_item.product_name}</p>
          <p className="text-xs text-muted-foreground">{rr.order_item.variant_name} &middot; Qty {rr.return_qty}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <AttemptBadge attempt={rr.attempt_count} max={maxAttempts} />
          <StatusBadge status={rr.status} />
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Reason:</span> {rr.reason}
      </p>

      {/* Admin needs info box */}
      {needsReply && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">Admin needs more info:</p>
          <p>{rr.admin_notes}</p>
          <InlineReplyForm rr={rr} onUpdated={onUpdated} />
        </div>
      )}

      {/* Rejection reason */}
      {isRejected && rr.admin_notes && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300">
          <p className="font-semibold mb-0.5">
            {isRejectedFinal ? 'Request rejected (no further attempts allowed):' : 'Rejection reason:'}
          </p>
          <p>{rr.admin_notes}</p>
        </div>
      )}

      {/* No further requests notice */}
      {isRejectedFinal && (
        <p className="text-xs text-muted-foreground italic">
          No further return requests allowed for this item.
        </p>
      )}

      {/* Refund info */}
      {rr.refund_amount && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          Refund: &#8377;{rr.refund_amount}
        </p>
      )}

      {/* Timeline toggle */}
      {rr.logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowTimeline((p) => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTimeline ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showTimeline ? 'Hide' : 'Show'} timeline ({rr.logs.length})
          </button>
          {showTimeline && (
            <div className="mt-3">
              <ReturnRequestTimeline logs={rr.logs} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
