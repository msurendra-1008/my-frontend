import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, Sun, Moon, ChevronLeft, ChevronRight,
  FileSpreadsheet, FileText, Plus, Trash2, X,
  CalendarDays, Users2, ToggleLeft, ChevronDown, Search,
} from 'lucide-react'
import { AdminSidebar }    from '@/components/layout/AdminSidebar'
import { cn }              from '@utils/cn'
import { useTheme }        from '@context/ThemeContext'
import { useAuthStore }    from '@/store/authStore'
import { payrollService }  from '@/services/payrollService'
import { attendanceService } from '@/services/attendanceService'
import type { EmployeeProfile } from '@/types/payroll.types'
import type {
  CalendarDay, EmployeeCalendar, MonthlySummary,
  PublicHoliday, AttendanceStatus, LeaveType, LeaveBalance,
} from '@/types/attendance.types'

/* ── Constants ─────────────────────────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

type Tab = 'calendar' | 'holidays' | 'leave'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:  'Present',
  absent:   'Absent',
  half_day: 'Half Day',
  leave:    'Leave',
  holiday:  'Holiday',
  week_off: 'Week Off',
  future:   'Future',
}

const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present:  'bg-green-500/15 text-green-700 dark:text-green-400 border-green-400/30',
  absent:   'bg-red-500/15 text-red-700 dark:text-red-400 border-red-400/30',
  half_day: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/30',
  leave:    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-400/30',
  holiday:  'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-400/30',
  week_off: 'bg-muted/60 text-muted-foreground border-border/40',
  future:   'bg-muted/30 text-muted-foreground/50 border-border/20',
}

const STATUS_CELL: Record<AttendanceStatus, string> = {
  present:  'bg-green-500/10 border-green-400/20',
  absent:   'bg-red-500/10 border-red-400/20',
  half_day: 'bg-amber-500/10 border-amber-400/20',
  leave:    'bg-blue-500/10 border-blue-400/20',
  holiday:  'bg-purple-500/10 border-purple-400/20',
  week_off: 'bg-muted/40 border-border/20',
  future:   'bg-background border-border/10 opacity-50',
}

const STATUS_CODE: Record<AttendanceStatus, string> = {
  present:  'P',
  absent:   'A',
  half_day: 'H',
  leave:    'L',
  holiday:  'HO',
  week_off: 'WO',
  future:   '—',
}

const MARKABLE: AttendanceStatus[] = ['present', 'absent', 'half_day', 'leave']
const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'casual',  label: 'Casual Leave' },
  { value: 'sick',    label: 'Sick Leave' },
  { value: 'earned',  label: 'Earned Leave' },
  { value: 'unpaid',  label: 'Unpaid Leave' },
  { value: 'other',   label: 'Other' },
]

/* ── Employee Combobox ──────────────────────────────────────────────────────── */
function EmployeeComboBox({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeProfile[]
  value: string
  onChange: (id: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = employees.find(e => e.id === value)

  const filtered = search.trim()
    ? employees.filter(e =>
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_code.toLowerCase().includes(search.toLowerCase()),
      )
    : employees

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className={cn(
          'flex items-center justify-between w-full rounded-md border bg-background px-2.5 py-1.5 text-xs transition-colors',
          open ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-border/80',
        )}
      >
        {selected ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{selected.employee_code}</span>
            <span className="text-foreground truncate">{selected.full_name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select employee…</span>
        )}
        <ChevronDown size={13} className={cn('ml-2 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 w-full min-w-[260px] rounded-md border border-border bg-card shadow-lg">
          {/* search input */}
          <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
            <Search size={12} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>

          {/* list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">No employees found</p>
            ) : (
              filtered.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => select(e.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors',
                    e.id === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0">{e.employee_code}</span>
                  <span className="truncate">{e.full_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Mark Dialog ────────────────────────────────────────────────────────────── */
function MarkDialog({
  day,
  onClose,
  onSaved,
  employeeId,
}: {
  day: CalendarDay
  onClose: () => void
  onSaved: () => void
  employeeId: string
}) {
  const [sel,       setSel]       = useState<AttendanceStatus>(
    MARKABLE.includes(day.status) ? day.status : 'present',
  )
  const [leaveType, setLeaveType] = useState<LeaveType>(day.leave_type ?? 'casual')
  const [notes,     setNotes]     = useState(day.notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      await attendanceService.markAttendance({
        employee:   employeeId,
        date:       day.date,
        status:     sel,
        leave_type: sel === 'leave' ? leaveType : null,
        notes,
      })
      onSaved()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
      setErr(msg?.error ?? msg?.detail ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-xl border border-border bg-card shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">
            {day.date} &nbsp;·&nbsp; {day.day_name}
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MARKABLE.map(s => (
                <button
                  key={s}
                  onClick={() => setSel(s)}
                  className={cn(
                    'rounded-md border py-1.5 text-xs font-medium transition-all',
                    sel === s
                      ? STATUS_CHIP[s] + ' ring-1 ring-current'
                      : 'border-border/40 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {sel === 'leave' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Leave Type</label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                {LEAVE_TYPES.map(lt => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Add notes…"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          {err && (
            <p className="text-xs text-red-600 dark:text-red-400">{err}</p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Summary Chips ──────────────────────────────────────────────────────────── */
function SummaryChips({ s }: { s: MonthlySummary }) {
  const items: { key: AttendanceStatus; count: number }[] = [
    { key: 'present',  count: s.present },
    { key: 'absent',   count: s.absent },
    { key: 'half_day', count: s.half_day },
    { key: 'leave',    count: s.leave },
    { key: 'holiday',  count: s.holiday },
    { key: 'week_off', count: s.week_off },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ key, count }) => (
        <span
          key={key}
          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', STATUS_CHIP[key])}
        >
          <span className="font-bold">{STATUS_CODE[key]}</span>
          <span>{count}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        Paid&nbsp;{s.paid_days.toFixed(1)}/{s.working_days}
      </span>
    </div>
  )
}

/* ── Calendar Grid ──────────────────────────────────────────────────────────── */
function CalendarGrid({
  calendar,
  onDayClick,
}: {
  calendar: EmployeeCalendar
  onDayClick: (d: CalendarDay) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/30">
            {['#', 'Date', 'Day', 'Status', 'Code', 'Leave', 'Notes'].map(h => (
              <th
                key={h}
                className="border border-border/30 px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground first:text-center"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendar.days.map(day => {
            const isClickable = !day.is_future && !day.is_sunday && day.status !== 'holiday'
            return (
              <tr
                key={day.date}
                onClick={() => isClickable && onDayClick(day)}
                className={cn(
                  'border border-border/20 transition-colors',
                  STATUS_CELL[day.status],
                  isClickable ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110' : '',
                  day.is_today ? 'ring-1 ring-inset ring-primary/60' : '',
                )}
              >
                <td className="border-r border-border/20 px-2 py-1 text-center font-semibold">
                  {day.day_num}
                </td>
                <td className="border-r border-border/20 px-2 py-1">{day.date}</td>
                <td className="border-r border-border/20 px-2 py-1 text-muted-foreground">{day.day_name}</td>
                <td className="border-r border-border/20 px-2 py-1">
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium border', STATUS_CHIP[day.status])}>
                    {STATUS_LABEL[day.status]}
                  </span>
                </td>
                <td className="border-r border-border/20 px-2 py-1 text-center font-bold">
                  {STATUS_CODE[day.status]}
                </td>
                <td className="border-r border-border/20 px-2 py-1 text-muted-foreground">
                  {day.leave_type ? LEAVE_TYPES.find(l => l.value === day.leave_type)?.label ?? day.leave_type : ''}
                </td>
                <td className="px-2 py-1 text-muted-foreground max-w-[160px] truncate">{day.notes}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Holidays Tab ───────────────────────────────────────────────────────────── */
function HolidaysTab({ year }: { year: number }) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [form,     setForm]     = useState({ date: '', name: '' })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  const load = useCallback(() => {
    setLoading(true)
    attendanceService.getHolidays({ year: String(year) })
      .then(r => setHolidays(r.data))
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => { load() }, [load])

  async function addHoliday() {
    if (!form.date || !form.name.trim()) { setErr('Date and name are required.'); return }
    setSaving(true)
    setErr('')
    try {
      await attendanceService.createHoliday(form)
      setForm({ date: '', name: '' })
      setAdding(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: Record<string, string[]> } })?.response?.data
      setErr(msg ? Object.values(msg).flat().join(' ') : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteHoliday(id: string) {
    if (!confirm('Delete this holiday?')) return
    await attendanceService.deleteHoliday(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Public Holidays — {year}</p>
        <button
          onClick={() => { setAdding(true); setErr('') }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus size={13} />Add Holiday
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Holiday Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Republic Day"
                className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button onClick={addHoliday} disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No holidays for {year}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => (
                <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 text-foreground font-medium">{h.date}</td>
                  <td className="px-3 py-2 text-foreground">{h.name}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                      h.is_active ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
                      {h.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteHoliday(h.id)}
                      className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Leave Balances Tab ─────────────────────────────────────────────────────── */
function LeaveTab({
  employees,
  year,
}: {
  employees: EmployeeProfile[]
  year: number
}) {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [form,     setForm]     = useState({ casual_leave: 0, sick_leave: 0, earned_leave: 0 })
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    attendanceService.getLeaveBalances({ year: String(year), page_size: '200' })
      .then(r => setBalances(r.data.results ?? []))
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => { load() }, [load])

  async function saveBalance(id: string) {
    setSaving(true)
    try {
      await attendanceService.updateLeaveBalance(id, form)
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const empIds = new Set(balances.map(b => b.employee))
  const missing = employees.filter(e => !empIds.has(e.id))

  async function createBalance(empId: string) {
    await attendanceService.upsertLeaveBalance({ employee: empId, year, casual_leave: 0, sick_leave: 0, earned_leave: 0 })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Leave Balances — {year}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : (
        <div className="space-y-2">
          {missing.length > 0 && (
            <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              {missing.length} employee(s) have no leave balance for {year}.
              <button
                onClick={() => Promise.all(missing.map(e => createBalance(e.id))).then(load)}
                className="underline font-medium"
              >
                Initialize all
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Code', 'Name', 'Casual', 'Sick', 'Earned', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balances.map(b => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{b.employee_code}</td>
                    <td className="px-3 py-2 text-foreground">{b.employee_name}</td>
                    {editing === b.id ? (
                      <>
                        {(['casual_leave', 'sick_leave', 'earned_leave'] as const).map(field => (
                          <td key={field} className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={form[field]}
                              onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))}
                              className="w-16 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          <button onClick={() => saveBalance(b.id)} disabled={saving}
                            className="mr-1 rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground disabled:opacity-50">
                            {saving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-foreground">{b.casual_leave}</td>
                        <td className="px-3 py-2 text-foreground">{b.sick_leave}</td>
                        <td className="px-3 py-2 text-foreground">{b.earned_leave}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setEditing(b.id)
                              setForm({
                                casual_leave: Number(b.casual_leave),
                                sick_leave:   Number(b.sick_leave),
                                earned_leave: Number(b.earned_leave),
                              })
                            }}
                            className="text-[10px] text-muted-foreground underline hover:text-foreground"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No leave balances for {year}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ Main Page ════════════════════════════════════════════════════════════════ */
export function AttendancePage() {
  const { theme, toggleTheme } = useTheme()
  useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const now   = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [tab,   setTab]   = useState<Tab>('calendar')

  /* employees */
  const [employees,  setEmployees]  = useState<EmployeeProfile[]>([])
  const [employeeId, setEmployeeId] = useState('')

  /* calendar */
  const [calendar,  setCalendar]  = useState<EmployeeCalendar | null>(null)
  const [calLoading, setCalLoading] = useState(false)
  const [calErr,    setCalErr]    = useState('')

  /* mark dialog */
  const [markDay, setMarkDay] = useState<CalendarDay | null>(null)

  /* load employees once */
  useEffect(() => {
    payrollService.getEmployees({ is_active: 'true', page_size: '200' })
      .then(r => {
        const list = r.data.results ?? []
        setEmployees(list)
        if (list.length > 0 && !employeeId) setEmployeeId(list[0].id)
      })
  }, [])

  /* load calendar when employee / month / year change */
  const loadCalendar = useCallback(() => {
    if (!employeeId) return
    setCalLoading(true)
    setCalErr('')
    attendanceService.getCalendar(employeeId, year, month)
      .then(r => setCalendar(r.data))
      .catch(() => setCalErr('Failed to load attendance data.'))
      .finally(() => setCalLoading(false))
  }, [employeeId, year, month])

  useEffect(() => {
    if (tab === 'calendar') loadCalendar()
  }, [loadCalendar, tab])

  /* month nav */
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else              setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else               setMonth(m => m + 1)
  }

  /* export */
  function openExport(format: 'excel' | 'pdf') {
    if (!employeeId) return
    const url = attendanceService.getExportUrl(employeeId, year, month, format)
    window.open(url, '_blank')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Header ── */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card px-4">
          <div className="flex items-center gap-3">
            <button className="flex lg:hidden text-muted-foreground" onClick={() => setMobileOpen(o => !o)}>
              <Menu size={20} />
            </button>
            <CalendarDays size={18} className="text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Attendance Management</h1>
          </div>
          <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* ── Tabs ── */}
          <div className="flex gap-1 mb-5 border-b border-border/40">
            {([['calendar', 'Attendance Calendar', CalendarDays], ['holidays', 'Public Holidays', ToggleLeft], ['leave', 'Leave Balances', Users2]] as const).map(
              ([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                    tab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ),
            )}
          </div>

          {/* ── Calendar Tab ── */}
          {tab === 'calendar' && (
            <div className="space-y-4">
              {/* controls */}
              <div className="flex flex-wrap gap-3 items-end">
                {/* Employee picker */}
                <div className="flex-1 min-w-[240px] max-w-sm">
                  <label className="text-xs text-muted-foreground mb-1 block">Employee</label>
                  <EmployeeComboBox
                    employees={employees}
                    value={employeeId}
                    onChange={setEmployeeId}
                  />
                </div>

                {/* Month navigator */}
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <div className="min-w-[130px] text-center text-sm font-semibold text-foreground">
                    {MONTHS[month - 1]} {year}
                  </div>
                  <button onClick={nextMonth} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Export */}
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => openExport('excel')}
                    disabled={!employeeId}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <FileSpreadsheet size={13} />Excel
                  </button>
                  <button
                    onClick={() => openExport('pdf')}
                    disabled={!employeeId}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <FileText size={13} />PDF
                  </button>
                </div>
              </div>

              {/* Summary */}
              {calendar && !calLoading && (
                <SummaryChips s={calendar.summary} />
              )}

              {/* Calendar */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {calLoading ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
                ) : calErr ? (
                  <div className="py-16 text-center text-sm text-red-600 dark:text-red-400">{calErr}</div>
                ) : !calendar ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Select an employee to view attendance.</div>
                ) : (
                  <CalendarGrid
                    calendar={calendar}
                    onDayClick={setMarkDay}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="font-medium">Legend:</span>
                {Object.entries(STATUS_CODE).filter(([k]) => k !== 'future').map(([k, code]) => (
                  <span key={k} className={cn('rounded border px-1.5 py-0.5 font-semibold', STATUS_CHIP[k as AttendanceStatus])}>
                    {code} = {STATUS_LABEL[k as AttendanceStatus]}
                  </span>
                ))}
                <span className="ml-2 text-muted-foreground/70">Click a past workday to mark attendance.</span>
              </div>
            </div>
          )}

          {tab === 'holidays' && <HolidaysTab year={year} />}

          {tab === 'leave' && <LeaveTab employees={employees} year={year} />}
        </main>
      </div>

      {/* Mark dialog */}
      {markDay && employeeId && (
        <MarkDialog
          day={markDay}
          employeeId={employeeId}
          onClose={() => setMarkDay(null)}
          onSaved={loadCalendar}
        />
      )}
    </div>
  )
}
