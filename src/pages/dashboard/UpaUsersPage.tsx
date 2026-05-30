import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Users, X } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useTheme } from '@context/ThemeContext';
import { Badge } from '@components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { treeService } from '@/services/treeService';
import type { LegUser } from '@/types/tree.types';

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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

const LEG_KEYS = ['L', 'M', 'R'] as const;
const LEG_FULL: Record<string, string> = { L: 'Left', M: 'Middle', R: 'Right' };

function UpaUserDetailSheet({
  user,
  onClose,
}: {
  user: UpaUser;
  onClose: () => void;
}) {
  const [childrenSummary, setChildrenSummary] =
    useState<{ L: LegUser | null; M: LegUser | null; R: LegUser | null } | null>(null);
  const [legsLoading, setLegsLoading] = useState(false);

  useEffect(() => {
    if (!user.upa_id) {
      setChildrenSummary(null);
      return;
    }
    setLegsLoading(true);
    treeService.getProfile(user.upa_id)
      .then((res) => setChildrenSummary(res.data.children_summary))
      .catch(() => setChildrenSummary(null))
      .finally(() => setLegsLoading(false));
  }, [user.upa_id]);

  const details = [
    { label: 'UPA ID',          value: user.upa_id || '—' },
    { label: 'Mobile',          value: user.mobile || '—' },
    { label: 'Sponsor',         value: user.parent_upa_id || 'Standalone' },
    { label: 'Placed in leg',   value: user.leg ? LEG_LABEL[user.leg] : 'Standalone' },
    { label: 'Level',           value: user.depth_level != null ? String(user.depth_level) : '—' },
    { label: 'Wallet Balance',  value: `₹ ${user.wallet_balance}` },
    { label: 'Status',          value: user.is_active ? 'Active' : 'Inactive' },
    { label: 'Network Joined',  value: formatDate(user.joined_at) },
    { label: 'Account Created', value: formatDate(user.date_joined) },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div className="relative flex w-full max-w-md flex-col bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">{user.full_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user.upa_id || 'No UPA ID'} · {user.mobile || 'No mobile'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Member details card */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Member Details
            </p>
            <div className="space-y-2.5">
              {details.map((d) => (
                <div key={d.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className={`font-medium ${
                    d.label === 'Status'
                      ? user.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                      : 'text-foreground'
                  }`}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Legs card */}
          {user.upa_id ? (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Direct Legs
              </p>
              {legsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {LEG_KEYS.map((key) => {
                    const node = childrenSummary?.[key] ?? null;
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 text-center text-xs transition-colors ${
                          node
                            ? 'bg-green-500/10 border-green-400/40'
                            : 'border-dashed bg-muted/30'
                        }`}
                      >
                        <p className="font-medium text-muted-foreground mb-2 capitalize">
                          {LEG_FULL[key]}
                        </p>
                        {node ? (
                          <>
                            <p className="font-semibold text-foreground text-xs leading-tight">
                              {node.name}
                            </p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">
                              {node.upa_id}
                            </p>
                            <span className="inline-block mt-1.5 rounded-full bg-green-500/20
                                             text-green-600 dark:text-green-400 text-[10px]
                                             px-1.5 py-0.5 font-medium">
                              Occupied
                            </span>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-[10px]">Vacant</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              Not placed in UPA tree yet — no leg data available.
            </div>
          )}

          {/* Action button */}
          {user.upa_id && (
            <button
              onClick={() => { window.location.href = `/admin/upa-tree?highlight=${user.upa_id}`; }}
              className="w-full h-9 rounded-lg border text-sm font-medium
                         hover:bg-muted transition-colors text-foreground"
            >
              View in UPA tree →
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function UpaUsersPage() {
  const { user }               = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [upaUsers, setUpaUsers]         = useState<UpaUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [selectedUser, setSelectedUser] = useState<UpaUser | null>(null);

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

  const stats = {
    total:      upaUsers.length,
    active:     upaUsers.filter((u) => u.is_active).length,
    standalone: upaUsers.filter((u) => !u.parent_upa_id).length,
  };

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
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground
                         transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Badge variant={roleBadgeVariant(user?.role ?? '')} className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Stats cards — equal 3-column grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total UPA Users', value: loading ? '…' : stats.total,      valueClass: 'text-foreground' },
              { label: 'Active',          value: loading ? '…' : stats.active,     valueClass: 'text-green-600 dark:text-green-400' },
              { label: 'Standalone',      value: loading ? '…' : stats.standalone, valueClass: 'text-amber-600 dark:text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {s.label}
                </p>
                <p className={`text-3xl font-bold ${s.valueClass}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between
                            border-b px-4 sm:px-5 py-3 sm:py-4 gap-2 sm:gap-3">
              <h2 className="font-semibold text-foreground shrink-0">All UPA Members</h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, UPA ID or mobile…"
                className="h-8 rounded-md border bg-muted/40 px-3 text-xs text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-1
                           focus:ring-ring w-full sm:w-64"
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
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                        <p className="font-medium text-primary hover:underline">{u.full_name}</p>
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
                            u.leg === 'L' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                            u.leg === 'M' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                                            'bg-amber-500/10 text-amber-700 dark:text-amber-400'
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
                        <span className={`inline-flex items-center gap-1 text-xs font-medium
                          ${u.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full
                            ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`}
                          />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(u.date_joined)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Detail sheet */}
      {selectedUser && (
        <UpaUserDetailSheet
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
