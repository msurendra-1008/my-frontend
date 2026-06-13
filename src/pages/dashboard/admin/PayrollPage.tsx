import { useState, useEffect, useCallback } from 'react'
import {
  Menu, Sun, Moon, ChevronLeft, ChevronRight,
  CheckCircle, Clock, RefreshCw, DollarSign, Users2,
  X, ExternalLink, AlertCircle,
} from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { cn } from '@utils/cn'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { payrollService } from '@/services/payrollService'
import type { PayrollMonth } from '@/types/payroll.types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const fmt = (v: string | number) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function PayrollPage() {
  const { theme, toggleTheme } = useTheme()
  useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  /* month/year nav */
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  /* data */
  const [records,     setRecords]     = useState<PayrollMonth[]>([])
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [genMsg,      setGenMsg]      = useState<string | null>(null)

  /* detail sheet */
  const [selected,    setSelected]    = useState<PayrollMonth | null>(null)
  const [paying,      setPaying]      = useState(false)
  const [payMsg,      setPayMsg]      = useState<string | null>(null)

  /* ── load ── */
  const load = useCallback(() => {
    setLoading(true)
    payrollService.getPayroll({ month: String(month), year: String(year), page_size: '100' })
      .then(r => setRecords(r.data.results ?? []))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { load() }, [load])

  /* ── month nav ── */
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else              setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else               setMonth(m => m + 1)
  }

  /* ── generate payroll ── */
  async function generatePayroll() {
    setGenerating(true); setGenMsg(null)
    try {
      const r = await payrollService.generatePayroll({ month, year })
      setGenMsg(`Generated ${r.data.created} records (${r.data.skipped} skipped).`)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setGenMsg('Error: ' + (e.response?.data?.error ?? 'Unknown error'))
    } finally { setGenerating(false) }
  }

  /* ── pay ── */
  async function paySalary(id: string) {
    setPaying(true); setPayMsg(null)
    try {
      const r = await payrollService.payEmployee(id)
      setPayMsg('Payment processed successfully.')
      setSelected(r.data)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setPayMsg('Error: ' + (e.response?.data?.error ?? 'Unknown error'))
    } finally { setPaying(false) }
  }

  /* ── summary ── */
  const totalCount   = records.length
  const paidCount    = records.filter(r => r.status === 'paid').length
  const pendingCount = totalCount - paidCount
  const totalNet     = records.reduce((s, r) => s + Number(r.net_salary), 0)
  const totalPaid    = records.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.net_salary), 0)
  const totalPending = totalNet - totalPaid

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* header */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Payroll</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="rounded-md p-2 hover:bg-muted/50">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* month navigation */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="rounded-md border p-1.5 hover:bg-muted/50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-semibold w-40 text-center">
                {MONTHS[month - 1]} {year}
              </h2>
              <button onClick={nextMonth} className="rounded-md border p-1.5 hover:bg-muted/50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {genMsg && (
                <p className={cn(
                  'text-sm',
                  genMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                )}>{genMsg}</p>
              )}
              <button
                onClick={generatePayroll}
                disabled={generating}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-60"
              >
                <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
                {generating ? 'Generating…' : 'Generate Payroll'}
              </button>
            </div>
          </div>

          {/* summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users2 className="h-4 w-4" /> Employees
              </div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">{paidCount} paid · {pendingCount} pending</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-4 w-4" /> Total Payroll
              </div>
              <p className="text-2xl font-bold">{fmt(totalNet)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-xs mb-1 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> Paid
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">{paidCount} employees</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-xs mb-1 text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" /> Pending
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{fmt(totalPending)}</p>
              <p className="text-xs text-muted-foreground">{pendingCount} employees</p>
            </div>
          </div>

          {/* table */}
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No payroll records for {MONTHS[month - 1]} {year}.</p>
              <button
                onClick={generatePayroll}
                disabled={generating}
                className="mt-3 text-sm text-primary hover:underline disabled:opacity-60"
              >
                Generate payroll for this month
              </button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(rec => (
                    <tr
                      key={rec.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => { setSelected(rec); setPayMsg(null) }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{rec.employee_name}</div>
                        <div className="text-xs text-muted-foreground">{rec.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{rec.department_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{fmt(rec.gross_salary)}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">−{fmt(rec.total_deductions)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(rec.net_salary)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          rec.status === 'paid'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                        )}>
                          {rec.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rec.status === 'pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(rec); setPayMsg(null) }}
                            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ── Detail sheet ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-card shadow-xl">
            {/* sheet header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">{selected.employee_name}</h2>
                <p className="text-xs text-muted-foreground">{selected.employee_code} · {MONTHS[selected.month - 1]} {selected.year}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* status badge */}
              <div className={cn(
                'flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium',
                selected.status === 'paid'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
              )}>
                {selected.status === 'paid' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {selected.status === 'paid' ? `Paid on ${new Date(selected.paid_at!).toLocaleDateString('en-IN')}` : 'Payment Pending'}
                {selected.paid_by_name && <span className="ml-auto text-xs opacity-80">by {selected.paid_by_name}</span>}
              </div>

              {/* earnings breakdown */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
                <div className="rounded-md border divide-y text-sm">
                  {([
                    ['Basic',            selected.basic],
                    ['HRA',              selected.hra],
                    ['DA',               selected.da],
                    ['Transport',        selected.transport],
                    ['Other Allowance',  selected.other_allowance],
                  ] as [string, string][]).map(([label, val]) => Number(val) > 0 && (
                    <div key={label} className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span>{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 font-semibold bg-muted/30">
                    <span>Gross Salary</span>
                    <span>{fmt(selected.gross_salary)}</span>
                  </div>
                </div>
              </div>

              {/* deductions */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
                <div className="rounded-md border divide-y text-sm">
                  {([
                    ['PF',               selected.pf_deduction],
                    ['ESI',              selected.esi_deduction],
                    ['TDS',              selected.tds_deduction],
                    ['Other Deduction',  selected.other_deduction],
                  ] as [string, string][]).map(([label, val]) => Number(val) > 0 && (
                    <div key={label} className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-red-600 dark:text-red-400">−{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 font-semibold bg-muted/30">
                    <span>Total Deductions</span>
                    <span className="text-red-600 dark:text-red-400">−{fmt(selected.total_deductions)}</span>
                  </div>
                </div>
              </div>

              {/* net */}
              <div className="rounded-md border bg-primary/5 border-primary/20 px-4 py-3 flex justify-between items-center">
                <span className="font-semibold">Net Salary</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(selected.net_salary)}</span>
              </div>

              {/* salary slip link */}
              <a
                href={payrollService.getSalarySlipUrl(selected.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> View Salary Slip
              </a>

              {/* pay action */}
              {selected.status === 'pending' && (
                <div className="space-y-3">
                  {payMsg && (
                    <div className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                      payMsg.startsWith('Error')
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>
                      <AlertCircle className="h-4 w-4 shrink-0" /> {payMsg}
                    </div>
                  )}
                  <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    This will debit <strong>{fmt(selected.net_salary)}</strong> from the company wallet.
                  </div>
                  <button
                    onClick={() => paySalary(selected.id)}
                    disabled={paying}
                    className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {paying ? 'Processing…' : `Pay ${fmt(selected.net_salary)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
