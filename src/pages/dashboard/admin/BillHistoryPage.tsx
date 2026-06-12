import { useState, useEffect } from 'react'
import { Menu, Sun, Moon, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import type { OfflineBill } from '@/types/billing.types'

function roleBadgeVariant(role: string) {
  if (role === 'superadmin') return 'danger' as const
  if (role === 'admin')      return 'warning' as const
  return 'info' as const
}

const PAGE_SIZE = 20

export function BillHistoryPage() {
  const { theme, toggleTheme } = useTheme()
  const { user }               = useAuthStore()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [bills, setBills]           = useState<OfflineBill[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected]     = useState<OfflineBill | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const fetchBills = (p: number, q: string) => {
    setLoading(true)
    const params: Record<string, string> = { page: String(p), page_size: String(PAGE_SIZE) }
    if (q.trim()) params.search = q.trim()
    billingService.getBills(params)
      .then(r => {
        setBills(r.data.results ?? [])
        setTotalCount(r.data.count ?? 0)
      })
      .catch(() => { setBills([]); setTotalCount(0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBills(page, search) }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchBills(1, search)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 bg-card px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden text-muted-foreground">
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-semibold text-foreground">Bill History</h1>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-8 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52"
                placeholder="Search bill / customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user && (
              <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                {user.role}
              </Badge>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex sm:hidden items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-8 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search bill / customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              Search
            </button>
          </form>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading…</div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
              <FileText size={24} className="opacity-40" />
              No bills found
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Bill No.</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Customer</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Payment</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Billed By</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {bills.map(b => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{b.bill_number}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {b.walkin_name || b.customer_type}
                          {b.walkin_mobile && <span className="ml-1 text-xs">({b.walkin_mobile})</span>}
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="capitalize text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {b.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">
                          ₹{Number(b.amount_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell text-xs">{b.billed_by_name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                          {new Date(b.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setSelected(b)}
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Bill detail modal */}
      {selected && (
        <BillDetailModal bill={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function BillDetailModal({ bill, onClose }: { bill: OfflineBill; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border/50 w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <p className="font-semibold text-foreground text-sm">{bill.bill_number}</p>
            <p className="text-xs text-muted-foreground">{new Date(bill.created_at).toLocaleString('en-IN')}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Customer */}
          <div className="rounded-md bg-muted/30 px-3 py-2 text-sm space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
            <p className="text-foreground capitalize">{bill.customer_type}</p>
            {bill.walkin_name && <p className="text-muted-foreground">{bill.walkin_name}</p>}
            {bill.walkin_mobile && <p className="text-muted-foreground">{bill.walkin_mobile}</p>}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Items</p>
            <div className="divide-y divide-border/40 rounded-md border border-border/50 overflow-hidden">
              {bill.items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="text-foreground">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_name} · {item.sku} · ×{item.quantity}</p>
                  </div>
                  <p className="font-medium text-foreground">₹{Number(item.line_total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-md bg-muted/30 px-3 py-2 space-y-1 text-sm">
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span className="text-green-600 dark:text-green-400">−₹{Number(bill.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total Paid</span>
              <span>₹{Number(bill.amount_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {bill.cash_received && (
              <div className="flex justify-between text-muted-foreground">
                <span>Cash Received</span>
                <span>₹{Number(bill.cash_received).toFixed(2)}</span>
              </div>
            )}
            {bill.change_given && Number(bill.change_given) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Change</span>
                <span>₹{Number(bill.change_given).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Billed by: {bill.billed_by_name} · {bill.payment_method.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
