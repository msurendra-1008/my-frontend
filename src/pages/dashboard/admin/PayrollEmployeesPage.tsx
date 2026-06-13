import { useState, useEffect, useCallback } from 'react'
import {
  Menu, Sun, Moon, Plus, Pencil, Search, X, ChevronLeft,
  User, Building2, Banknote, Shield, Check,
} from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { cn } from '@utils/cn'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { payrollService } from '@/services/payrollService'
import axiosInstance from '@/utils/axiosInstance'
import type {
  EmployeeProfile, Department,
  CreateEmployeeProfilePayload, UpdateEmployeeProfilePayload, SalaryStructurePayload,
} from '@/types/payroll.types'

/* ── helpers ── */
const fmt = (v: string | number) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', intern: 'Intern',
}

/* ── blank forms ── */
const blankProfile = (): Partial<CreateEmployeeProfilePayload & UpdateEmployeeProfilePayload> => ({
  user: '', employee_code: '', department: null, designation: '',
  employment_type: 'full_time', date_of_joining: '',
  bank_name: '', bank_account: '', bank_ifsc: '', is_active: true,
})

const blankSalary = (): SalaryStructurePayload => ({
  basic: 0, hra: 0, da: 0, transport: 0, other_allowance: 0,
  pf_deduction: 0, esi_deduction: 0, tds_deduction: 0, other_deduction: 0,
  effective_from: new Date().toISOString().slice(0, 10),
})

/* ── computed CTC preview ── */
function ctcPreview(s: SalaryStructurePayload) {
  const gross = s.basic + s.hra + s.da + s.transport + s.other_allowance
  const deductions = s.pf_deduction + s.esi_deduction + s.tds_deduction + s.other_deduction
  const net = gross - deductions
  return { gross, deductions, net }
}

type DrawerTab = 'basic' | 'salary' | 'permissions'

export function PayrollEmployeesPage() {
  const { theme, toggleTheme } = useTheme()
  useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  /* list state */
  const [employees,    setEmployees]    = useState<EmployeeProfile[]>([])
  const [departments,  setDepartments]  = useState<Department[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterDept,   setFilterDept]   = useState('')
  const [filterActive, setFilterActive] = useState('true')

  /* drawer state */
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [drawerTab,    setDrawerTab]    = useState<DrawerTab>('basic')
  const [editing,      setEditing]      = useState<EmployeeProfile | null>(null)
  const [profileForm,  setProfileForm]  = useState(blankProfile())
  const [salaryForm,   setSalaryForm]   = useState(blankSalary())
  const [saving,       setSaving]       = useState(false)
  const [salarySaving, setSalarySaving] = useState(false)
  const [msg,          setMsg]          = useState<string | null>(null)
  const [salaryMsg,    setSalaryMsg]    = useState<string | null>(null)

  /* user search (for create) */
  const [userSearch,   setUserSearch]   = useState('')
  const [userResults,  setUserResults]  = useState<{ id: string; full_name: string; email: string }[]>([])
  const [userSearching, setUserSearching] = useState(false)

  /* dept modal */
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [newDeptName,   setNewDeptName]   = useState('')
  const [deptSaving,    setDeptSaving]    = useState(false)

  /* ── load ── */
  const loadData = useCallback(() => {
    const params: Record<string, string> = { page_size: '100' }
    if (search)       params.search    = search
    if (filterDept)   params.department = filterDept
    if (filterActive) params.is_active = filterActive

    setLoading(true)
    Promise.all([
      payrollService.getEmployees(params),
      payrollService.getDepartments(),
    ]).then(([empRes, deptRes]) => {
      setEmployees(empRes.data.results ?? [])
      setDepartments(deptRes.data as unknown as Department[])
    }).finally(() => setLoading(false))
  }, [search, filterDept, filterActive])

  useEffect(() => { loadData() }, [loadData])

  /* ── user search (debounced) ── */
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setUserSearching(true)
      try {
        const res = await axiosInstance.get('/api/v1/auth/users/', { params: { search: userSearch } })
        setUserResults((res.data ?? []).map((u: { id: string; full_name: string; email: string }) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
        })))
      } catch { setUserResults([]) }
      finally   { setUserSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch])

  /* ── open drawer ── */
  function openCreate() {
    setEditing(null)
    setProfileForm(blankProfile())
    setSalaryForm(blankSalary())
    setUserSearch(''); setUserResults([])
    setMsg(null); setSalaryMsg(null)
    setDrawerTab('basic')
    setDrawerOpen(true)
  }

  function openEdit(emp: EmployeeProfile) {
    setEditing(emp)
    setProfileForm({
      employee_code:   emp.employee_code,
      department:      emp.department,
      designation:     emp.designation,
      employment_type: emp.employment_type,
      date_of_joining: emp.date_of_joining ?? '',
      bank_name:       emp.bank_name,
      bank_account:    emp.bank_account,
      bank_ifsc:       emp.bank_ifsc,
      is_active:       emp.is_active,
    })
    if (emp.salary_structure) {
      const s = emp.salary_structure
      setSalaryForm({
        basic:           Number(s.basic),
        hra:             Number(s.hra),
        da:              Number(s.da),
        transport:       Number(s.transport),
        other_allowance: Number(s.other_allowance),
        pf_deduction:    Number(s.pf_deduction),
        esi_deduction:   Number(s.esi_deduction),
        tds_deduction:   Number(s.tds_deduction),
        other_deduction: Number(s.other_deduction),
        effective_from:  s.effective_from,
      })
    } else {
      setSalaryForm(blankSalary())
    }
    setMsg(null); setSalaryMsg(null)
    setDrawerTab('basic')
    setDrawerOpen(true)
  }

  /* ── save profile ── */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      if (editing) {
        await payrollService.updateEmployee(editing.id, profileForm as UpdateEmployeeProfilePayload)
        setMsg('Saved.')
      } else {
        await payrollService.createEmployee(profileForm as CreateEmployeeProfilePayload)
        setMsg('Employee created.')
        setDrawerOpen(false)
      }
      loadData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setMsg('Error: ' + JSON.stringify(e.response?.data ?? 'Unknown error'))
    } finally { setSaving(false) }
  }

  /* ── save salary structure ── */
  async function saveSalary(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSalarySaving(true); setSalaryMsg(null)
    try {
      await payrollService.upsertSalaryStructure(editing.id, salaryForm)
      setSalaryMsg('Salary structure saved.')
      loadData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setSalaryMsg('Error: ' + JSON.stringify(e.response?.data ?? 'Unknown error'))
    } finally { setSalarySaving(false) }
  }

  /* ── add dept ── */
  async function addDepartment(e: React.FormEvent) {
    e.preventDefault()
    if (!newDeptName.trim()) return
    setDeptSaving(true)
    try {
      const res = await payrollService.createDepartment({ name: newDeptName.trim() })
      setDepartments(prev => [...prev, res.data])
      setNewDeptName(''); setDeptModalOpen(false)
    } catch { /* ignore */ }
    finally { setDeptSaving(false) }
  }

  const { gross, deductions, net } = ctcPreview(salaryForm)

  /* ── render ── */
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
            <h1 className="text-lg font-semibold">Employees</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="rounded-md p-2 hover:bg-muted/50">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={openCreate} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="h-9 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search name / code / email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
            <button
              onClick={() => setDeptModalOpen(true)}
              className="h-9 rounded-md border px-3 text-sm hover:bg-muted/50"
            >
              + Department
            </button>
          </div>

          {/* table */}
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : employees.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No employees found.</p>
              <button onClick={openCreate} className="mt-3 text-sm text-primary hover:underline">Add first employee</button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{emp.full_name}</div>
                        <div className="text-xs text-muted-foreground">{emp.employee_code} · {emp.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.department_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{EMPLOYMENT_LABELS[emp.employment_type]}</td>
                      <td className="px-4 py-3">
                        {emp.salary_structure
                          ? <span className="font-medium">{fmt(emp.salary_structure.net_salary)}</span>
                          : <span className="text-muted-foreground italic">Not set</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          emp.is_active
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400',
                        )}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(emp)} className="rounded-md p-1.5 hover:bg-muted/50">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-card shadow-xl">
            {/* drawer header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setDrawerOpen(false)} className="rounded-md p-1 hover:bg-muted/50">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="font-semibold">{editing ? editing.full_name : 'New Employee'}</h2>
              </div>
              <button onClick={() => setDrawerOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            {/* tabs */}
            <div className="flex border-b">
              {([
                { key: 'basic',       label: 'Basic Info',        icon: User },
                { key: 'salary',      label: 'Salary Structure',  icon: Banknote },
                { key: 'permissions', label: 'Permissions',       icon: Shield },
              ] as { key: DrawerTab; label: string; icon: React.ElementType }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setDrawerTab(t.key)}
                  disabled={t.key !== 'basic' && !editing}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium transition-colors disabled:opacity-40',
                    drawerTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {/* tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── Basic Info tab ── */}
              {drawerTab === 'basic' && (
                <form onSubmit={saveProfile} className="space-y-4">
                  {!editing && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">User *</label>
                      <div className="relative">
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Search by name or email…"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                        />
                        {(userResults.length > 0 || userSearching) && (
                          <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-card shadow-lg">
                            {userSearching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
                            {userResults.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                                onClick={() => {
                                  setProfileForm(prev => ({ ...prev, user: u.id }))
                                  setUserSearch(u.full_name + ' — ' + u.email)
                                  setUserResults([])
                                }}
                              >
                                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="font-medium">{u.full_name}</span>
                                <span className="text-muted-foreground">{u.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Employee Code *</label>
                      <input
                        required
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={profileForm.employee_code ?? ''}
                        onChange={e => setProfileForm(prev => ({ ...prev, employee_code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Designation</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={profileForm.designation ?? ''}
                        onChange={e => setProfileForm(prev => ({ ...prev, designation: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Department</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={profileForm.department ?? ''}
                        onChange={e => setProfileForm(prev => ({ ...prev, department: e.target.value || null }))}
                      >
                        <option value="">— None —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Employment Type</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={profileForm.employment_type ?? 'full_time'}
                        onChange={e => setProfileForm(prev => ({ ...prev, employment_type: e.target.value as 'full_time' }))}
                      >
                        {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Date of Joining</label>
                    <input
                      type="date"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={profileForm.date_of_joining ?? ''}
                      onChange={e => setProfileForm(prev => ({ ...prev, date_of_joining: e.target.value || null }))}
                    />
                  </div>

                  <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Bank Details
                    </p>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Bank Name</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={profileForm.bank_name ?? ''}
                        onChange={e => setProfileForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Account Number</label>
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={profileForm.bank_account ?? ''}
                          onChange={e => setProfileForm(prev => ({ ...prev, bank_account: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">IFSC Code</label>
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                          value={profileForm.bank_ifsc ?? ''}
                          onChange={e => setProfileForm(prev => ({ ...prev, bank_ifsc: e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                  </div>

                  {editing && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                          profileForm.is_active ? 'bg-primary' : 'bg-muted-foreground/30',
                        )}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                          profileForm.is_active ? 'translate-x-6' : 'translate-x-1',
                        )} />
                      </button>
                      <span className="text-sm">Active</span>
                    </div>
                  )}

                  {msg && (
                    <p className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      msg.startsWith('Error') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>{msg}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-md border px-4 py-2 text-sm hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || (!editing && !profileForm.user)}
                      className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : <><Check className="h-4 w-4" /> Save</>}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Salary Structure tab ── */}
              {drawerTab === 'salary' && editing && (
                <form onSubmit={saveSalary} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Set the monthly salary components. Changes apply to future payroll only.
                  </p>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
                    {([
                      ['basic',           'Basic'],
                      ['hra',             'HRA'],
                      ['da',              'DA'],
                      ['transport',       'Transport Allowance'],
                      ['other_allowance', 'Other Allowance'],
                    ] as [keyof SalaryStructurePayload, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="w-40 shrink-0 text-sm">{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={salaryForm[key] as number}
                          onChange={e => setSalaryForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
                    {([
                      ['pf_deduction',    'PF'],
                      ['esi_deduction',   'ESI'],
                      ['tds_deduction',   'TDS'],
                      ['other_deduction', 'Other Deduction'],
                    ] as [keyof SalaryStructurePayload, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="w-40 shrink-0 text-sm">{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={salaryForm[key] as number}
                          onChange={e => setSalaryForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>

                  {/* live CTC preview */}
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live CTC Preview</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross</p>
                        <p className="font-semibold">{fmt(gross)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Deductions</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">−{fmt(deductions)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net / Month</p>
                        <p className="font-bold text-green-600 dark:text-green-400">{fmt(net)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Effective From *</label>
                    <input
                      required
                      type="date"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={salaryForm.effective_from}
                      onChange={e => setSalaryForm(prev => ({ ...prev, effective_from: e.target.value }))}
                    />
                  </div>

                  {salaryMsg && (
                    <p className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      salaryMsg.startsWith('Error') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>{salaryMsg}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={salarySaving}
                      className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {salarySaving ? 'Saving…' : <><Check className="h-4 w-4" /> Save Salary Structure</>}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Permissions tab ── */}
              {drawerTab === 'permissions' && editing && (
                <div className="space-y-4">
                  <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    Permissions are managed via the Employee Profile in the People section.
                    Go to <strong>People → Employees</strong> to edit module-level permissions for this user.
                  </div>
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="text-sm font-medium">{editing.full_name}</p>
                    <p className="text-xs text-muted-foreground">{editing.email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Role: <span className="font-medium text-foreground">{editing.role}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Department modal ── */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeptModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 font-semibold">Add Department</h3>
            <form onSubmit={addDepartment} className="space-y-4">
              <input
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Department name"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeptModalOpen(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted/50">Cancel</button>
                <button type="submit" disabled={deptSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {deptSaving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
