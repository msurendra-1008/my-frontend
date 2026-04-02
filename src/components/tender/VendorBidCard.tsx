import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { NegotiationThread } from './NegotiationThread'
import type { VendorBid, TenderItem } from '@/types/tender.types'

const BID_STATUS_COLORS: Record<string, string> = {
  bid_submitted:     'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  under_negotiation: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bid_revised:       'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  awarded:           'bg-green-500/10 text-green-700 dark:text-green-400',
  not_awarded:       'bg-muted text-muted-foreground',
}

const BID_STATUS_LABELS: Record<string, string> = {
  bid_submitted:     'Submitted',
  under_negotiation: 'Negotiating',
  bid_revised:       'Revised',
  awarded:           'Awarded',
  not_awarded:       'Not awarded',
}

interface Props {
  bid: VendorBid
  tenderItem: TenderItem
  tenderStatus: string
  defaultOpen?: boolean
  onNegotiate: (bidId: string, notes: string) => Promise<void>
  onQuickAward: (bidId: string) => void
}

export function VendorBidCard({
  bid, tenderItem, tenderStatus,
  defaultOpen = false,
  onNegotiate, onQuickAward,
}: Props) {
  const [open, setOpen]         = useState(defaultOpen)
  const [negNotes, setNegNotes] = useState('')
  const [sending, setSending]   = useState(false)

  const bidItem = bid.items.find(i => i.tender_item === tenderItem.id)
  if (!bidItem) return null

  const totalValue = Number(bidItem.price_per_unit) * bidItem.supply_quantity
  const vsTarget   = tenderItem.target_price
    ? Number(bidItem.price_per_unit) - Number(tenderItem.target_price)
    : null
  const canNegotiate = tenderStatus === 'open'
  const canAward     = tenderStatus === 'closed' &&
                       bid.status !== 'awarded' &&
                       bid.status !== 'not_awarded'

  const handleNegotiate = async () => {
    if (!negNotes.trim()) return
    setSending(true)
    try {
      await onNegotiate(bid.id, negNotes.trim())
      setNegNotes('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-b border-border/50 last:border-0">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {bid.vendor_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bidItem.supply_quantity} units · Dispatch:{' '}
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })
              .format(new Date(bidItem.dispatch_date))}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-foreground">
            ₹{Number(bidItem.price_per_unit).toLocaleString()}/unit
            {vsTarget !== null && (
              <span className={cn(
                'text-xs ml-1.5',
                vsTarget < 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}>
                {vsTarget < 0 ? '−' : '+'}₹{Math.abs(vsTarget).toFixed(2)}{' '}
                {vsTarget < 0 ? '✅' : '❌'}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Total: ₹{totalValue.toLocaleString()}
          </p>
        </div>

        <span className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-medium flex-shrink-0',
          BID_STATUS_COLORS[bid.status] ?? 'bg-muted text-muted-foreground',
        )}>
          {BID_STATUS_LABELS[bid.status] ?? bid.status}
        </span>

        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
          open && 'rotate-180',
        )} />
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border/40">

          {/* Key stats grid */}
          <div className="grid grid-cols-3 gap-3 py-3">
            {[
              { label: 'Supply qty',  value: `${bidItem.supply_quantity} units` },
              { label: 'Price/unit',  value: `₹${Number(bidItem.price_per_unit).toLocaleString()}` },
              { label: 'Total value', value: `₹${totalValue.toLocaleString()}` },
              { label: 'Dispatch',    value: new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(bidItem.dispatch_date)) },
              { label: 'Revisions',   value: `${bid.update_count}` },
            ].map(d => (
              <div key={d.label}>
                <p className="text-[11px] text-muted-foreground">{d.label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly breakdown */}
          {bidItem.monthly_breakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Monthly breakdown
              </p>
              <table className="w-full text-xs border border-border/50 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Month</th>
                    <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {bidItem.monthly_breakdown.map((b, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-3 py-1.5">{b.month}</td>
                      <td className="px-3 py-1.5">{b.quantity} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Negotiation thread */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Negotiation thread
            </p>
            <NegotiationThread logs={bid.negotiation_logs ?? []} />
          </div>

          {/* Negotiate form */}
          {canNegotiate && (
            <div className="space-y-2">
              <textarea
                value={negNotes}
                onChange={e => setNegNotes(e.target.value)}
                placeholder="Send negotiation note to this vendor..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleNegotiate}
                disabled={!negNotes.trim() || sending}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/40 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending…' : '↩ Send note'}
              </button>
            </div>
          )}

          {/* Quick award */}
          {canAward && (
            <button
              onClick={() => onQuickAward(bid.id)}
              className="mt-2 h-8 px-3 rounded-lg text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-400/40 hover:bg-green-500/20 transition-colors"
            >
              ✓ Quick award this vendor
            </button>
          )}

          {bid.status === 'awarded' && (
            <div className="mt-2 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              ✓ Awarded — PO generated
            </div>
          )}
        </div>
      )}
    </div>
  )
}
