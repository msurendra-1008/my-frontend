import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { FilterToolbar } from '@/components/admin/FilterToolbar'
import { Button } from '@/components/ui/Button'
import { tenderService } from '@/services/tenderService'
import { cn } from '@/utils/cn'
import type { TenderListItem, TenderStatus } from '@/types/tender.types'
import { CreateTenderSheet } from '@/components/tender/CreateTenderSheet'

const STATUS_COLORS: Record<TenderStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  open:      'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  closed:    'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  awarded:   'bg-green-500/10 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const STATUS_LABELS: Record<TenderStatus, string> = {
  draft:     'Draft',
  open:      'Accepting bids',
  closed:    'Awaiting award',
  awarded:   'Awarded',
  cancelled: 'Cancelled',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso))
}

export function TenderPage() {
  const navigate = useNavigate()
  const [tenders, setTenders]       = useState<TenderListItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [sidebarOpen, setSidebar]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await tenderService.getTenders(params)
      const data = res.data as unknown as { results?: TenderListItem[] } | TenderListItem[]
      setTenders(Array.isArray(data) ? data : (data as { results?: TenderListItem[] }).results ?? [])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const stats = {
    total:   tenders.length,
    open:    tenders.filter(t => t.status === 'open').length,
    closed:  tenders.filter(t => t.status === 'closed').length,
    awarded: tenders.filter(t => t.status === 'awarded').length,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebar(v => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <h1 className="text-lg font-semibold">Tenders</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create tender
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Total',          value: stats.total },
              { label: 'Open',           value: stats.open },
              { label: 'Awaiting award', value: stats.closed },
              { label: 'Awarded',        value: stats.awarded },
            ].map(s => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4">
            <FilterToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by tender number or title…"
              filters={[{
                id: 'status',
                placeholder: 'All status',
                value: statusFilter,
                onChange: setStatus,
                width: 'w-[160px]',
                options: [
                  { value: 'draft',     label: 'Draft' },
                  { value: 'open',      label: 'Open' },
                  { value: 'closed',    label: 'Closed' },
                  { value: 'awarded',   label: 'Awarded' },
                  { value: 'cancelled', label: 'Cancelled' },
                ],
              }]}
              resultCount={{ showing: tenders.length, total: tenders.length, label: 'tenders' }}
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : tenders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                No tenders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pl-5 pr-4 pt-4">Tender no.</th>
                      <th className="pb-3 pr-4 pt-4">Title</th>
                      <th className="pb-3 pr-4 pt-4 text-center">Products</th>
                      <th className="pb-3 pr-4 pt-4 text-center">Bids</th>
                      <th className="pb-3 pr-4 pt-4">Status</th>
                      <th className="pb-3 pr-4 pt-4">Deadline</th>
                      <th className="pb-3 pr-4 pt-4">Created</th>
                      <th className="pb-3 pr-4 pt-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tenders.map(t => (
                      <tr key={t.id} className="hover:bg-muted/40">
                        <td className="py-3 pl-5 pr-4 font-mono text-xs font-semibold">
                          {t.tender_number}
                        </td>
                        <td className="max-w-[200px] truncate py-3 pr-4 font-medium">
                          {t.title}
                        </td>
                        <td className="py-3 pr-4 text-center">{t.item_count}</td>
                        <td className="py-3 pr-4 text-center">{t.bid_count}</td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_COLORS[t.status]
                          )}>
                            {STATUS_LABELS[t.status]}
                          </span>
                        </td>
                        <td className={cn(
                          'py-3 pr-4 text-xs',
                          t.bidding_deadline && new Date(t.bidding_deadline) < new Date()
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                        )}>
                          {t.bidding_deadline ? formatDate(t.bidding_deadline) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => navigate(`/admin/tender/${t.id}`)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View →
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

      <CreateTenderSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={load}
      />
    </div>
  )
}
