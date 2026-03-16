import { useAuth } from '@context/AuthContext';

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const joined = user?.created_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(user.created_at))
    : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.first_name || user?.email}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your account today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Account Status" value="Active" sub="Your account is in good standing" />
        <StatCard label="Member Since" value={joined} sub="Thank you for being with us" />
        <StatCard label="Email" value={user?.email ?? '—'} sub="Primary contact address" />
        <StatCard label="Full Name" value={user?.full_name || '—'} sub="Displayed across your profile" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/account"
            className="flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent"
          >
            <span className="text-xl">👤</span>
            <span className="text-sm font-medium text-foreground">Edit Profile</span>
            <span className="ml-1 text-muted-foreground">→</span>
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent"
          >
            <span className="text-xl">⚙️</span>
            <span className="text-sm font-medium text-foreground">Settings</span>
            <span className="ml-1 text-muted-foreground">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
