import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import type { User } from '@/types/auth';

const PERMISSIONS_LIST = [
  'inventory.view','inventory.edit','orders.view','orders.edit',
  'tenders.view','tenders.create','vendors.view','vendors.approve','reports.view',
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-[22px] font-medium text-foreground">{value}</p>
    </div>
  );
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function AdminDashboard() {
  const { user, updateUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [employees, setEmployees]       = useState<User[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [formError, setFormError]       = useState('');
  const [formLoading, setFormLoading]   = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', password: '',
    department: '', role: 'employee' as const, permissions: [] as string[],
  });

  useEffect(() => {
    authService.getMe().then((r) => updateUser(r.data)).catch(() => {});
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      authService.listEmployees().then((r) => {
        const data = r.data as { results?: User[] } | User[];
        setEmployees(Array.isArray(data) ? data : (data.results ?? []));
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTogglePerm = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await authService.createEmployee({
        name: form.name,
        email: form.email || undefined,
        mobile: form.mobile || undefined,
        password: form.password,
        department: form.department,
        role: 'employee',
        permissions: form.permissions,
      });
      setShowForm(false);
      setForm({ name:'',email:'',mobile:'',password:'',department:'',role:'employee',permissions:[] });
      const r = await authService.listEmployees();
      const data = r.data as { results?: User[] } | User[];
      setEmployees(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err: unknown) {
      const d = (err as { response?: { data?: Record<string,unknown> } })?.response?.data;
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to create employee.');
    } finally {
      setFormLoading(false);
    }
  };

  const roleBadgeVariant = (role: string): BadgeVariant => {
    if (role === 'superadmin') return 'danger';
    if (role === 'admin')      return 'warning';
    return 'info';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[52px] items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen((o) => !o)}>
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={roleBadgeVariant(user?.role ?? '')} className="capitalize">{user?.role}</Badge>
            {user?.department && <Badge variant="default">{user.department}</Badge>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total UPA Users" value="—" />
            <StatCard label="Employees"       value={employees.length} />
            <StatCard label="Active Orders"   value="—" />
            <StatCard label="Open Tenders"    value="—" />
          </div>

          {/* Employees table — admin/superadmin only */}
          <RoleGuard allowedRoles={['superadmin', 'admin']}>
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-semibold text-foreground">Employees</h2>
                <Button size="sm" onClick={() => setShowForm(true)}>Add Employee</Button>
              </div>

              {showForm && (
                <div className="border-b bg-muted/30 px-5 py-4">
                  <h3 className="mb-3 text-sm font-medium text-foreground">New Employee</h3>
                  {formError && (
                    <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</div>
                  )}
                  <form onSubmit={handleCreateEmployee} className="grid grid-cols-2 gap-3">
                    <Input label="Full Name"   value={form.name}       onChange={(e) => setForm((f)=>({...f,name:e.target.value}))}       fullWidth placeholder="John Doe" />
                    <Input label="Email"       value={form.email}      onChange={(e) => setForm((f)=>({...f,email:e.target.value}))}      fullWidth placeholder="emp@example.com" />
                    <Input label="Mobile"      value={form.mobile}     onChange={(e) => setForm((f)=>({...f,mobile:e.target.value}))}     fullWidth placeholder="9876543210" />
                    <Input label="Department"  value={form.department} onChange={(e) => setForm((f)=>({...f,department:e.target.value}))} fullWidth placeholder="Sales" />
                    <Input label="Password"    type="password" value={form.password}   onChange={(e) => setForm((f)=>({...f,password:e.target.value}))}   fullWidth />
                    <div className="col-span-2">
                      <p className="mb-1 text-xs font-medium text-foreground">Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        {PERMISSIONS_LIST.map((p) => (
                          <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => handleTogglePerm(p)} className="h-3.5 w-3.5" />
                            <span className="text-muted-foreground">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                      <Button type="submit" size="sm" isLoading={formLoading}>Create</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium">Department</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No employees yet</td></tr>
                    ) : employees.map((emp) => (
                      <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email || emp.mobile}</p>
                        </td>
                        <td className="px-5 py-3 capitalize text-muted-foreground">{emp.role}</td>
                        <td className="px-5 py-3 text-muted-foreground">{emp.department || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${emp.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${emp.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RoleGuard>
        </main>
      </div>
    </div>
  );
}
