import { useState, useEffect, useCallback } from 'react'
import {
  Menu, Sun, Moon, Plus, Pencil, Search, X, ChevronLeft,
  User, Building2, Banknote, Shield, Check, Eye, EyeOff,
  CreditCard, ExternalLink,
} from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { cn } from '@utils/cn'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { payrollService } from '@/services/payrollService'
import axiosInstance from '@/utils/axiosInstance'
import type {
  EmployeeProfile, Department, PayrollMonth,
  CreateEmployeeProfilePayload, UpdateEmployeeProfilePayload, SalaryStructurePayload,
} from '@/types/payroll.types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtMonth = (m: number, y: number) => `${MONTHS[m - 1]} ${y}`

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
  needs_system_access: false,
  can_manage_orders: false, can_manage_products: false, can_manage_billing: false,
  can_view_reports: false, can_manage_returns: false, can_manage_warehouse: false,
  can_manage_vendors: false, can_manage_tenders: false, can_manage_procurement: false,
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
  const [userSearch,        setUserSearch]        = useState('')
  const [userResults,       setUserResults]       = useState<{ id: string; full_name: string; email: string }[]>([])
  const [userSearching,     setUserSearching]     = useState(false)
  const [userSearchDone,    setUserSearchDone]    = useState(false)
  const [selectedUserLabel, setSelectedUserLabel] = useState('')

  /* permissions tab */
  const [permList,     setPermList]     = useState<string[]>([])
  const [permLoading,  setPermLoading]  = useState(false)
  const [permSaving,   setPermSaving]   = useState(false)
  const [permMsg,      setPermMsg]      = useState<string | null>(null)
  const [moduleSaving, setModuleSaving] = useState(false)
  const [moduleMsg,    setModuleMsg]    = useState<string | null>(null)

  /* inline create-account form */
  const [showCreateUser,        setShowCreateUser]        = useState(false)
  const [newUserName,           setNewUserName]           = useState('')
  const [newUserEmail,          setNewUserEmail]          = useState('')
  const [newUserMobile,         setNewUserMobile]         = useState('')
  const [newUserRole,           setNewUserRole]           = useState('')
  const [newUserPassword,       setNewUserPassword]       = useState('')
  const [newUserConfirmPw,      setNewUserConfirmPw]      = useState('')
  const [showNewPassword,       setShowNewPassword]       = useState(false)
  const [creatingUser,          setCreatingUser]          = useState(false)
  const [createUserError,       setCreateUserError]       = useState<string | null>(null)
  const [createUserCredentials, setCreateUserCredentials] = useState<{ login: string; password: string; role: string } | null>(null)

  /* employee detail sheet */
  const [detailEmployee,      setDetailEmployee]      = useState<EmployeeProfile | null>(null)
  const [detailPayroll,       setDetailPayroll]       = useState<PayrollMonth[]>([])
  const [detailPayrollLoading, setDetailPayrollLoading] = useState(false)

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

  /* ── load permissions when Permissions tab opens ── */
  useEffect(() => {
    if (drawerTab !== 'permissions' || !editing) return
    setPermLoading(true); setPermMsg(null)
    axiosInstance.get(`/api/v1/employees/${editing.user}/`)
      .then(r => setPermList(r.data.permissions ?? []))
      .catch(() => setPermList([]))
      .finally(() => setPermLoading(false))
  }, [drawerTab, editing])

  /* ── user search (debounced) ── */
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); setUserSearchDone(false); return }
    setUserSearchDone(false)
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
      finally   { setUserSearching(false); setUserSearchDone(true) }
    }, 400)
    return () => clearTimeout(t)
  }, [userSearch])

  /* ── load payroll history when detail sheet opens ── */
  useEffect(() => {
    if (!detailEmployee) { setDetailPayroll([]); return }
    setDetailPayrollLoading(true)
    payrollService.getPayroll({ employee: detailEmployee.id, page_size: '6' })
      .then(r => setDetailPayroll(r.data.results ?? []))
      .catch(() => setDetailPayroll([]))
      .finally(() => setDetailPayrollLoading(false))
  }, [detailEmployee])

  /* ── open drawer ── */
  function openCreate() {
    setEditing(null)
    setProfileForm(blankProfile())
    setSalaryForm(blankSalary())
    setUserSearch(''); setUserResults([]); setSelectedUserLabel(''); setUserSearchDone(false)
    setShowCreateUser(false)
    setNewUserName(''); setNewUserEmail(''); setNewUserMobile('')
    setNewUserRole(''); setNewUserPassword(''); setNewUserConfirmPw('')
    setShowNewPassword(false); setCreateUserError(null); setCreateUserCredentials(null)
    setMsg(null); setSalaryMsg(null)
    setDrawerTab('basic')
    setDrawerOpen(true)
  }

  function openEdit(emp: EmployeeProfile) {
    setEditing(emp)
    setProfileForm({
      employee_code:          emp.employee_code,
      department:             emp.department,
      designation:            emp.designation,
      employment_type:        emp.employment_type,
      date_of_joining:        emp.date_of_joining ?? '',
      bank_name:              emp.bank_name,
      bank_account:           emp.bank_account,
      bank_ifsc:              emp.bank_ifsc,
      is_active:              emp.is_active,
      needs_system_access:    emp.needs_system_access,
      can_manage_orders:      emp.can_manage_orders,
      can_manage_products:    emp.can_manage_products,
      can_manage_billing:     emp.can_manage_billing,
      can_view_reports:       emp.can_view_reports,
      can_manage_returns:     emp.can_manage_returns,
      can_manage_warehouse:   emp.can_manage_warehouse,
      can_manage_vendors:     emp.can_manage_vendors,
      can_manage_tenders:     emp.can_manage_tenders,
      can_manage_procurement: emp.can_manage_procurement,
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

  /* ── save module access flags ── */
  async function saveModuleAccess() {
    if (!editing) return
    setModuleSaving(true); setModuleMsg(null)
    try {
      await payrollService.updateEmployee(editing.id, {
        can_manage_orders:      profileForm.can_manage_orders,
        can_manage_products:    profileForm.can_manage_products,
        can_manage_billing:     profileForm.can_manage_billing,
        can_view_reports:       profileForm.can_view_reports,
        can_manage_returns:     profileForm.can_manage_returns,
        can_manage_warehouse:   profileForm.can_manage_warehouse,
        can_manage_vendors:     profileForm.can_manage_vendors,
        can_manage_tenders:     profileForm.can_manage_tenders,
        can_manage_procurement: profileForm.can_manage_procurement,
      } as UpdateEmployeeProfilePayload)
      setModuleMsg('Module access saved.')
      loadData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setModuleMsg('Error: ' + JSON.stringify(e.response?.data ?? 'Failed'))
    } finally { setModuleSaving(false) }
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
                        <button
                          onClick={() => setDetailEmployee(emp)}
                          className="text-xs font-medium text-primary hover:underline"
                        >View →</button>
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
                  {/* needs_system_access toggle — always visible */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, needs_system_access: !prev.needs_system_access }))}
                      className={cn(
                        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                        profileForm.needs_system_access ? 'bg-primary' : 'bg-muted-foreground/30',
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                        profileForm.needs_system_access ? 'translate-x-6' : 'translate-x-1',
                      )} />
                    </button>
                    <div>
                      <span className="text-sm font-medium">Needs System Access</span>
                      <p className="text-xs text-muted-foreground">Can log in to the system. Disable for payroll-only employees.</p>
                    </div>
                  </div>

                  {!editing && profileForm.needs_system_access && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">User *</label>

                      {/* Selected user chip */}
                      {selectedUserLabel ? (
                        <div className="flex items-center gap-2 rounded-md border border-green-400/40 bg-green-500/10 px-3 py-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                          <span className="flex-1 text-sm text-green-600 dark:text-green-400">{selectedUserLabel}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserLabel('')
                              setUserSearch('')
                              setUserSearchDone(false)
                              setShowCreateUser(false)
                              setProfileForm(prev => ({ ...prev, user: '' }))
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Type name or email to search…"
                              value={userSearch}
                              onChange={e => {
                                setUserSearch(e.target.value)
                                setShowCreateUser(false)
                                setProfileForm(prev => ({ ...prev, user: '' }))
                              }}
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
                                      setSelectedUserLabel(`${u.full_name} — ${u.email}`)
                                      setUserSearch('')
                                      setUserResults([])
                                      setUserSearchDone(false)
                                    }}
                                  >
                                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="font-medium">{u.full_name}</span>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* No results — offer to create account */}
                          {userSearchDone && !userSearching && userResults.length === 0 && userSearch.trim() && !showCreateUser && (
                            <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 text-sm">
                              <p className="text-amber-700 dark:text-amber-400">No user found for "{userSearch}".</p>
                              <button
                                type="button"
                                onClick={() => { setShowCreateUser(true); setNewUserName(userSearch); setCreateUserError(null) }}
                                className="mt-1 text-xs font-medium text-primary hover:underline"
                              >
                                + Create a new account for this person
                              </button>
                            </div>
                          )}

                          {/* Inline create account form */}
                          {showCreateUser && (
                            createUserCredentials ? (
                              /* ── credentials display after successful creation ── */
                              <div className="rounded-md border border-green-400/40 bg-green-500/10 p-3 space-y-2">
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">✅ Account created — save these credentials now</p>
                                <div className="rounded-md bg-muted/50 p-2.5 font-mono text-xs space-y-1">
                                  <p>Login: <span className="font-bold text-foreground">{createUserCredentials.login}</span></p>
                                  <p>Password: <span className="font-bold text-foreground">{createUserCredentials.password}</span></p>
                                  <p>Role: <span className="font-bold text-foreground">{createUserCredentials.role}</span></p>
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400">These credentials will not be shown again.</p>
                                <button
                                  type="button"
                                  onClick={() => { setCreateUserCredentials(null); setShowCreateUser(false) }}
                                  className="w-full rounded-md bg-green-600 py-1.5 text-xs font-medium text-white"
                                >Got it, I've saved these credentials</button>
                              </div>
                            ) : (
                              /* ── create account form ── */
                              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create New Account</p>
                                <input
                                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Full name *"
                                  value={newUserName}
                                  onChange={e => setNewUserName(e.target.value)}
                                />
                                <input
                                  type="email"
                                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Email (optional if mobile given)"
                                  value={newUserEmail}
                                  onChange={e => setNewUserEmail(e.target.value)}
                                />
                                <input
                                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Mobile (optional if email given)"
                                  value={newUserMobile}
                                  onChange={e => setNewUserMobile(e.target.value)}
                                />
                                <select
                                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  value={newUserRole}
                                  onChange={e => setNewUserRole(e.target.value)}
                                >
                                  <option value="">Select role *</option>
                                  <option value="employee">Employee (admin panel access)</option>
                                  <option value="delivery_partner">Delivery Partner (/delivery dashboard)</option>
                                  <option value="admin">Admin (full access)</option>
                                </select>
                                <div className="relative">
                                  <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    className="w-full rounded-md border bg-background px-3 py-1.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Password * (min 8 characters)"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(v => !v)}
                                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                                  >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                                <input
                                  type="password"
                                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Confirm password *"
                                  value={newUserConfirmPw}
                                  onChange={e => setNewUserConfirmPw(e.target.value)}
                                />
                                {newUserPassword && newUserConfirmPw && newUserPassword !== newUserConfirmPw && (
                                  <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                                )}
                                {createUserError && (
                                  <p className="text-xs text-red-600 dark:text-red-400">{createUserError}</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setShowCreateUser(false); setCreateUserError(null) }}
                                    className="flex-1 rounded-md border py-1.5 text-xs hover:bg-muted/50"
                                  >Cancel</button>
                                  <button
                                    type="button"
                                    disabled={
                                      creatingUser ||
                                      !newUserName.trim() ||
                                      (!newUserEmail.trim() && !newUserMobile.trim()) ||
                                      !newUserRole ||
                                      newUserPassword.length < 8 ||
                                      newUserPassword !== newUserConfirmPw
                                    }
                                    onClick={async () => {
                                      setCreatingUser(true); setCreateUserError(null)
                                      try {
                                        const res = await axiosInstance.post('/api/v1/auth/quick-create/', {
                                          name:     newUserName.trim(),
                                          email:    newUserEmail.trim() || undefined,
                                          mobile:   newUserMobile.trim() || undefined,
                                          role:     newUserRole,
                                          password: newUserPassword,
                                        })
                                        const created = res.data
                                        setProfileForm(prev => ({ ...prev, user: created.id }))
                                        setSelectedUserLabel(`${created.full_name} — ${created.email ?? created.mobile}`)
                                        setUserSearch(''); setUserSearchDone(false)
                                        setCreateUserCredentials({
                                          login:    created.email ?? created.mobile ?? newUserEmail ?? newUserMobile,
                                          password: newUserPassword,
                                          role:     newUserRole,
                                        })
                                      } catch (err: unknown) {
                                        const e = err as { response?: { data?: unknown } }
                                        setCreateUserError('Error: ' + JSON.stringify(e.response?.data ?? 'Failed'))
                                      } finally { setCreatingUser(false) }
                                    }}
                                    className="flex-1 rounded-md bg-primary py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                                  >
                                    {creatingUser ? 'Creating…' : 'Create & Select'}
                                  </button>
                                </div>
                              </div>
                            )
                          )}

                          {!userSearch && !showCreateUser && (
                            <p className="text-xs text-muted-foreground">Search and click a result to select a user.</p>
                          )}
                        </div>
                      )}
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
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{editing.full_name}</p>
                    <p className="text-xs text-muted-foreground">{editing.email} · Role: <span className="font-medium text-foreground">{editing.role}</span></p>
                  </div>

                  {/* Module feature access flags (saved to payroll endpoint) */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module Feature Access</p>
                    <p className="text-xs text-muted-foreground">Payroll-tracked feature flags for this employee.</p>
                    {([
                      { key: 'can_manage_orders',      label: 'Manage Orders' },
                      { key: 'can_manage_products',     label: 'Manage Products' },
                      { key: 'can_manage_billing',      label: 'Manage Billing' },
                      { key: 'can_view_reports',        label: 'View Reports' },
                      { key: 'can_manage_returns',      label: 'Manage Returns' },
                      { key: 'can_manage_warehouse',    label: 'Manage Warehouse' },
                      { key: 'can_manage_vendors',      label: 'Manage Vendors' },
                      { key: 'can_manage_tenders',      label: 'Manage Tenders' },
                      { key: 'can_manage_procurement',  label: 'Manage Procurement' },
                    ] as const).map(({ key, label }) => {
                      const checked = !!profileForm[key]
                      return (
                        <label
                          key={key}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors',
                            checked ? 'border-primary/20 bg-primary/5' : 'hover:bg-muted/30',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary shrink-0"
                            checked={checked}
                            onChange={() => setProfileForm(prev => ({ ...prev, [key]: !prev[key] }))}
                          />
                          <span className={cn('text-sm', checked && 'font-medium text-primary')}>{label}</span>
                        </label>
                      )
                    })}

                    {moduleMsg && (
                      <p className={cn(
                        'rounded-md px-3 py-2 text-sm',
                        moduleMsg.startsWith('Error') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
                      )}>{moduleMsg}</p>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={moduleSaving}
                        onClick={saveModuleAccess}
                        className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {moduleSaving ? 'Saving…' : <><Check className="h-4 w-4" /> Save Module Access</>}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4" />

                  {permLoading ? (
                    <p className="text-sm text-muted-foreground">Loading permissions…</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">System Access Permissions</p>
                      {([
                        {
                          module: 'Products',
                          perms: [
                            { key: 'products.view', label: 'View', desc: 'Browse products & pricing' },
                            { key: 'products.edit', label: 'Edit', desc: 'Create & edit products' },
                          ],
                        },
                        {
                          module: 'Orders & Returns',
                          perms: [
                            { key: 'orders.view',   label: 'View',   desc: 'View orders & returns' },
                            { key: 'orders.manage', label: 'Manage', desc: 'Process & update orders' },
                          ],
                        },
                        {
                          module: 'Inventory / Warehouse',
                          perms: [
                            { key: 'inventory.view',   label: 'View',   desc: 'View stock & warehouse' },
                            { key: 'inventory.manage', label: 'Manage', desc: 'Transfer & adjust stock' },
                          ],
                        },
                        {
                          module: 'Vendors & Procurement',
                          perms: [
                            { key: 'vendors.view',   label: 'View',   desc: 'View vendors & POs' },
                            { key: 'vendors.manage', label: 'Manage', desc: 'Create & edit vendors / POs' },
                          ],
                        },
                        {
                          module: 'Inspection',
                          perms: [
                            { key: 'inspection.view',    label: 'View',    desc: 'View inspection records' },
                            { key: 'inspection.perform', label: 'Perform', desc: 'Perform quality inspections' },
                          ],
                        },
                        {
                          module: 'Tenders',
                          perms: [
                            { key: 'tenders.view',   label: 'View',   desc: 'View tender documents' },
                            { key: 'tenders.manage', label: 'Manage', desc: 'Create & manage tenders' },
                          ],
                        },
                      ]).map(({ module, perms }) => (
                        <div key={module} className="rounded-md border overflow-hidden">
                          <div className="bg-muted/50 px-3 py-1.5">
                            <p className="text-xs font-semibold text-foreground">{module}</p>
                          </div>
                          <div className="divide-y">
                            {perms.map(({ key, label, desc }) => {
                              const checked = permList.includes(key)
                              return (
                                <label
                                  key={key}
                                  className={cn(
                                    'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                                    checked ? 'bg-primary/5' : 'hover:bg-muted/30',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-primary shrink-0"
                                    checked={checked}
                                    onChange={() => setPermList(prev =>
                                      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
                                    )}
                                  />
                                  <div className="flex items-baseline gap-2">
                                    <span className={cn('text-sm font-medium', checked && 'text-primary')}>{label}</span>
                                    <span className="text-xs text-muted-foreground">{desc}</span>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {permMsg && (
                    <p className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      permMsg.startsWith('Error') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>{permMsg}</p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={permSaving || permLoading}
                      onClick={async () => {
                        setPermSaving(true); setPermMsg(null)
                        try {
                          await axiosInstance.patch(`/api/v1/employees/${editing.user}/`, { permissions: permList })
                          setPermMsg('Permissions saved.')
                        } catch (err: unknown) {
                          const e = err as { response?: { data?: unknown } }
                          setPermMsg('Error: ' + JSON.stringify(e.response?.data ?? 'Failed'))
                        } finally { setPermSaving(false) }
                      }}
                      className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {permSaving ? 'Saving…' : <><Check className="h-4 w-4" /> Save Permissions</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Detail Sheet ── */}
      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailEmployee(null)} />
          <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-card shadow-xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setDetailEmployee(null)} className="rounded-md p-1 hover:bg-muted/50">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {detailEmployee.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold">{detailEmployee.full_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {detailEmployee.designation || '—'} · {detailEmployee.department_name || 'No dept'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { openEdit(detailEmployee); setDetailEmployee(null) }}
                  className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => setDetailEmployee(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* ── Badges row ── */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{detailEmployee.employee_code}</span>
                <span className="rounded-full border px-2.5 py-0.5 text-xs">{EMPLOYMENT_LABELS[detailEmployee.employment_type]}</span>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  detailEmployee.is_active
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400',
                )}>
                  {detailEmployee.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-xs capitalize">{detailEmployee.role}</span>
              </div>

              {/* ── Contact & Bank ── */}
              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Contact
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground text-xs">Email</span><p>{detailEmployee.email || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Mobile</span><p>{detailEmployee.mobile || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Date of Joining</span><p>{detailEmployee.date_of_joining ?? '—'}</p></div>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Bank Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground text-xs">Bank</span><p>{detailEmployee.bank_name || '—'}</p></div>
                  <div>
                    <span className="text-muted-foreground text-xs">Account</span>
                    <p className="font-mono">
                      {detailEmployee.bank_account
                        ? `****${detailEmployee.bank_account.slice(-4)}`
                        : '—'}
                    </p>
                  </div>
                  <div><span className="text-muted-foreground text-xs">IFSC</span><p className="font-mono">{detailEmployee.bank_ifsc || '—'}</p></div>
                </div>
              </div>

              {/* ── System Access ── */}
              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> System Access
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    detailEmployee.needs_system_access
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {detailEmployee.needs_system_access ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {detailEmployee.needs_system_access && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {([
                      ['can_manage_orders',      'Orders'],
                      ['can_manage_products',    'Products'],
                      ['can_manage_billing',     'Billing'],
                      ['can_view_reports',       'Reports'],
                      ['can_manage_returns',     'Returns'],
                      ['can_manage_warehouse',   'Warehouse'],
                      ['can_manage_vendors',     'Vendors'],
                      ['can_manage_tenders',     'Tenders'],
                      ['can_manage_procurement', 'Procurement'],
                    ] as [keyof EmployeeProfile, string][]).filter(([k]) => detailEmployee[k]).map(([, label]) => (
                      <span key={label} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{label}</span>
                    ))}
                    {!([
                      'can_manage_orders','can_manage_products','can_manage_billing',
                      'can_view_reports','can_manage_returns','can_manage_warehouse',
                      'can_manage_vendors','can_manage_tenders','can_manage_procurement',
                    ] as (keyof EmployeeProfile)[]).some(k => detailEmployee[k]) && (
                      <span className="text-xs text-muted-foreground">No module permissions</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Salary Structure ── */}
              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" /> Salary Structure
                </p>
                {detailEmployee.salary_structure ? (() => {
                  const s = detailEmployee.salary_structure
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {([
                          ['Basic', s.basic], ['HRA', s.hra], ['DA', s.da],
                          ['Transport', s.transport], ['Other Allowance', s.other_allowance],
                        ] as [string, string][]).map(([l, v]) => (
                          <div key={l} className="flex justify-between border-b border-border/20 py-0.5">
                            <span className="text-muted-foreground">{l}</span>
                            <span>{fmt(v)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-md bg-primary/5 border border-primary/20 p-3 grid grid-cols-3 gap-2">
                        <div><p className="text-xs text-muted-foreground">Gross</p><p className="font-semibold">{fmt(s.gross_salary)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Deductions</p><p className="font-semibold text-red-600 dark:text-red-400">−{fmt(s.total_deductions)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Net / Month</p><p className="font-bold text-green-600 dark:text-green-400">{fmt(s.net_salary)}</p></div>
                      </div>
                    </div>
                  )
                })() : (
                  <div className="text-sm text-muted-foreground">
                    No salary structure set yet.{' '}
                    <button
                      className="text-primary hover:underline"
                      onClick={() => { openEdit(detailEmployee); setDetailEmployee(null) }}
                    >Add one in Edit →</button>
                  </div>
                )}
              </div>

              {/* ── Payroll History ── */}
              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payroll History (last 6 months)</p>
                {detailPayrollLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : detailPayroll.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payroll records found.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Month</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gross</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detailPayroll.map(pm => (
                          <tr key={pm.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{fmtMonth(pm.month, pm.year)}</td>
                            <td className="px-3 py-2 text-right">{fmt(pm.gross_salary)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">{fmt(pm.net_salary)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                pm.status === 'paid'
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                              )}>
                                {pm.status === 'paid' ? 'Paid ✅' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {pm.status === 'paid' && (
                                <a
                                  href={payrollService.getSalarySlipUrl(pm.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  Slip <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
