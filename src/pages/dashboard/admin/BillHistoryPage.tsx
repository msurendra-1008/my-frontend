import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu, Sun, Moon, Search, FileText, Printer } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { orderService } from '@/services/orderService'
import { CommissionBreakupSection } from './OrdersPage'
import type { OrderListItem, Order, OrderStatus } from '@/types/order.types'
import { cn } from '@/utils/cn'

function roleBadgeVariant(role: string) {
  if (role === 'superadmin') return 'danger' as const
  if (role === 'admin')      return 'warning' as const
  return 'info' as const
}

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending:   'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  confirmed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  packed:    'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  shipped:   'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  delivered: 'bg-green-500/10 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', STATUS_CLASSES[status])}>
      {status}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

// ── Offline Order Detail Drawer ───────────────────────────────────────────────

function OrderDetailDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    orderService.getAdminOrder(orderId)
      .then(r => setOrder(r.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId])

  const handlePrint = (type: 'thermal' | 'a4') => {
    if (!order) return
    const html = type === 'thermal' ? generateThermalHTML(order) : generateA4HTML(order)
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-lg bg-card border-l border-border/50 flex flex-col h-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div>
            <p className="font-semibold text-foreground text-sm">
              {order?.offline_bill_number ?? 'Offline Order'}
            </p>
            <p className="text-xs text-muted-foreground">
              {order ? new Date(order.created_at).toLocaleString('en-IN') : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {order && (
              <>
                <button
                  onClick={() => handlePrint('thermal')}
                  title="Thermal print"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border/50 hover:bg-muted transition-colors"
                >
                  <Printer size={12} /> Thermal
                </button>
                <button
                  onClick={() => handlePrint('a4')}
                  title="A4 print"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border/50 hover:bg-muted transition-colors"
                >
                  <Printer size={12} /> A4
                </button>
              </>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm ml-1">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !order ? (
            <p className="text-sm text-muted-foreground">Failed to load order.</p>
          ) : (
            <>
              {/* Bill info */}
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm space-y-1">
                <p className="font-semibold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wide mb-1">🏪 POS Bill</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Bill No.</span>
                  <span className="font-mono font-semibold">{order.offline_bill_number ?? '—'}</span>
                </div>
                {order.billed_by_name && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Billed by</span>
                    <span className="font-medium">{order.billed_by_name}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                {order.customer_mobile && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-mono">{order.customer_mobile}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Items</p>
                <div className="divide-y divide-border/40 rounded-xl border overflow-hidden">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <p className="text-foreground font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.variant_name} · {item.sku} · ×{item.quantity}</p>
                      </div>
                      <p className="font-semibold text-foreground">₹{Number(item.line_total).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="rounded-xl border p-3 space-y-1 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
                {([
                  Number(order.upa_discount) > 0 && ['UPA Discount', `-₹${Number(order.upa_discount).toFixed(2)}`],
                  ['Total', `₹${Number(order.amount_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                ] as (false | string[])[] ).filter(Boolean).map((row, i) => {
                  const [label, val] = row as string[]
                  const isTotal = label === 'Total'
                  return (
                    <div key={i} className={cn('flex justify-between', isTotal && 'border-t pt-1.5 font-semibold mt-1')}>
                      <span className={!isTotal ? 'text-muted-foreground' : ''}>{label}</span>
                      <span>{val}</span>
                    </div>
                  )
                })}
              </div>

              {/* Commission breakdown */}
              <CommissionBreakupSection order={order} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Print helpers ─────────────────────────────────────────────────────────────

function generateThermalHTML(order: Order): string {
  const items = order.items.map(i =>
    `<tr><td>${i.product_name} ×${i.quantity}</td><td align="right">₹${Number(i.line_total).toFixed(2)}</td></tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><style>
    body{font-family:monospace;width:300px;font-size:12px}
    table{width:100%}td{padding:2px 0}
    .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:4px 0}
  </style></head><body>
    <div class="center bold">POS BILL</div>
    <div class="center">${order.offline_bill_number ?? order.order_number}</div>
    <div class="center">${new Date(order.created_at).toLocaleString('en-IN')}</div>
    <div class="line"></div>
    <table>${items}</table>
    <div class="line"></div>
    <table><tr><td class="bold">TOTAL</td><td align="right" class="bold">₹${Number(order.amount_payable).toFixed(2)}</td></tr></table>
    <div class="center" style="margin-top:8px">Thank you!</div>
  </body></html>`
}

function generateA4HTML(order: Order): string {
  const rows = order.items.map(i =>
    `<tr><td>${i.product_name}</td><td>${i.variant_name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${Number(i.line_total).toFixed(2)}</td></tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;font-size:14px;padding:40px}
    h2{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
    .total{text-align:right;font-size:16px;font-weight:bold;margin-top:12px}
  </style></head><body>
    <h2>POS Bill — ${order.offline_bill_number ?? order.order_number}</h2>
    <p>Date: ${new Date(order.created_at).toLocaleString('en-IN')} | Customer: ${order.customer_name} | Billed by: ${order.billed_by_name ?? '—'}</p>
    <table><thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="total">Total: ₹${Number(order.amount_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
  </body></html>`
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function BillHistoryPage() {
  const { theme, toggleTheme } = useTheme()
  const { user }               = useAuthStore()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [orders, setOrders]         = useState<OrderListItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [next, setNext]             = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [viewId, setViewId]         = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async (pg = 1, q = search, reset = true) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)

    const params: Record<string, string> = { page: String(pg) }
    if (q.trim()) params.search = q.trim()

    try {
      const r = await billingService.getOfflineOrders(params)
      setOrders(prev => reset ? r.data.results ?? [] : [...prev, ...(r.data.results ?? [])])
      setTotal(r.data.count ?? 0)
      setNext(r.data.next ?? null)
      setPage(pg)
    } catch {
      if (reset) { setOrders([]); setTotal(0) }
    } finally {
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [search])

  useEffect(() => { fetchOrders(1, search) }, [])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchOrders(1, val), 400)
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
            {!loading && (
              <span className="text-xs text-muted-foreground">{total} bills</span>
            )}
          </div>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-8 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52"
                placeholder="Search order / bill number…"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Mobile search */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-8 rounded-md border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search order / bill number…"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
              <FileText size={24} className="opacity-40" />
              No offline orders found
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Order / Bill', 'Customer', 'Amount', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-foreground text-xs">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(order.created_at))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{order.customer_mobile}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{Number(order.amount_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={order.order_status} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewId(order.id)}
                          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {next && !loading && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchOrders(page + 1, search, false)}
                disabled={loadingMore}
                className="rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Detail drawer */}
      {viewId && (
        <OrderDetailDrawer orderId={viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  )
}
