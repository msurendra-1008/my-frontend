import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@context/ThemeContext';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';

type Tab = 'account' | 'wallet' | 'orders' | 'shop';

function LegCard({ label, user: legUser, referralUrl }: {
  label: string;
  user?: { name: string; upa_id: string } | null;
  referralUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  if (legUser) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
        <p className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{legUser.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{legUser.upa_id}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">Vacant</p>
      <button onClick={copyReferral} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1">
        {copied ? <><Check size={10} /> Copied!</> : 'Invite'}
      </button>
    </div>
  );
}

export function UserDashboard() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const { theme, toggleTheme }          = useTheme();
  const navigate                         = useNavigate();
  const [tab, setTab]                    = useState<Tab>('account');
  const [copied, setCopied]              = useState(false);

  const referralUrl = `${window.location.origin}/register?ref=${user?.upa_id ?? ''}`;

  useEffect(() => {
    authService.getMe().then((r) => updateUser(r.data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    const refresh = tokenStorage.getRefresh();
    try { if (refresh) await authService.logout(refresh); } catch { /* proceed */ }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'wallet',  label: 'Wallet'  },
    { id: 'orders',  label: 'My Orders' },
    { id: 'shop',    label: 'Shop'    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-4">
          <span className="font-bold text-foreground">MyApp</span>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            {user?.upa_id && (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono">
                {user.upa_id}
              </span>
            )}
            {user?.wallet_balance !== null && user?.wallet_balance !== undefined && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                &#8377;{user.wallet_balance}
              </span>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto flex max-w-5xl gap-0 border-t px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-400 font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Account tab */}
        {tab === 'account' && (
          <div className="space-y-4">
            {/* Profile card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{user?.full_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Joined {user?.date_joined ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(user.date_joined)) : '—'}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Mobile: </span><span className="font-mono">{user?.mobile || '—'}</span></div>
                    <div><span className="text-muted-foreground">UPA ID: </span><span className="font-mono text-purple-700 dark:text-purple-400">{user?.upa_id || '—'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral link */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Your Referral Link</h3>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{referralUrl}</span>
                <button onClick={copyReferral} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            {/* My Connections */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">My Connections</h3>
              {/* Parent row — stub */}
              <div className="mb-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Parent: </span>
                <span className="font-medium text-foreground">—</span>
              </div>
              {/* 3 legs */}
              <div className="grid grid-cols-3 gap-3">
                <LegCard label="Left"   user={null} referralUrl={referralUrl} />
                <LegCard label="Middle" user={null} referralUrl={referralUrl} />
                <LegCard label="Right"  user={null} referralUrl={referralUrl} />
              </div>
            </div>
          </div>
        )}

        {/* Wallet tab */}
        {tab === 'wallet' && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">&#8377;{user?.wallet_balance ?? '0.00'}</p>
            </div>
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-4"><h3 className="font-semibold text-foreground">Transactions</h3></div>
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
            <p className="text-2xl">📦</p>
            <p className="mt-2 font-medium text-foreground">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start shopping to see your orders here!</p>
          </div>
        )}

        {/* Shop tab */}
        {tab === 'shop' && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
            <p className="text-2xl">🛍️</p>
            <p className="mt-2 font-medium text-foreground">Coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">The shop is being built. Check back later!</p>
          </div>
        )}
      </main>
    </div>
  );
}
