import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Users } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useTheme } from '@context/ThemeContext';
import { Badge } from '@components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

interface UpaUser {
  id:            string;
  full_name:     string;
  mobile:        string | null;
  upa_id:        string | null;
  wallet_balance: string;
  parent_upa_id: string | null;
  leg:           'L' | 'M' | 'R' | null;
  depth_level:   number | null;
  joined_at:     string | null;
  is_active:     boolean;
  date_joined:   string;
}

const LEG_LABEL: Record<string, string> = { L: 'Left', M: 'Middle', R: 'Right' };

export function UpaUsersPage() {
  const { user }             = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upaUsers, setUpaUsers]       = useState<UpaUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    setLoading(true);
    authService.listUpaUsers()
      .then((r) => {
        const data = r.data as { results?: UpaUser[] } | UpaUser[];
        setUpaUsers(Array.isArray(data) ? data : (data.results ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = upaUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      (u.upa_id ?? '').toLowerCase().includes(q) ||
      (u.mobile ?? '').includes(q)
    );
  });

  const roleBadgeVariant = (role: string) => {
    if (role === 'superadmin') return 'danger' as const;
    if (role === 'admin')      return 'warning' as const;
    return 'info' as const;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[52px] items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen((o) => !o)}>
              <Menu size={20} />
            </button>
            <Users size={16} className="text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">UPA Users</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Badge variant={roleBadgeVariant(user?.role ?? '')} className="capitalize">{user?.role}</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-3">
            <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total UPA Users</p>
              <p className="text-2xl font-semibold text-foreground">{loading ? '…' : upaUsers.length}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
              <p className="text-2xl font-semibold text-emerald-600">{loading ? '…' : upaUsers.filter((u) => u.is_active).length}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Standalone</p>
              <p className="text-2xl font-semibold text-amber-600">{loading ? '…' : upaUsers.filter((u) => !u.parent_upa_id).length}</p>
            </div>
          </div>

          {/* Table card */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b px-4 sm:px-5 py-3 sm:py-4 gap-2 sm:gap-3">
              <h2 className="font-semibold text-foreground shrink-0">All UPA Members</h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, UPA ID or mobile…"
                className="h-8 rounded-md border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-3 sm:px-5 font-medium">Member</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">UPA ID</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Sponsor</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Leg</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Level</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Wallet</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Status</th>
                    <th className="px-3 py-3 sm:px-5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground text-xs">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                        {search ? 'No results match your search.' : 'No UPA users yet.'}
                      </td>
                    </tr>
                  ) : filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                        <p className="font-medium text-foreground">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.mobile || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 font-mono text-xs text-purple-700 dark:text-purple-400">
                        {u.upa_id || '—'}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                        {u.parent_upa_id
                          ? u.parent_upa_id
                          : <span className="italic text-amber-600 dark:text-amber-400">Standalone</span>}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                        {u.leg ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            u.leg === 'L' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            u.leg === 'M' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {LEG_LABEL[u.leg]}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-muted-foreground text-center">
                        {u.depth_level ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-muted-foreground font-mono text-xs">
                        ₹{u.wallet_balance}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(u.date_joined))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
