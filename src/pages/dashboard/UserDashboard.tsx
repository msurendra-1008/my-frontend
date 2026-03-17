import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@context/ThemeContext';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import { treeService } from '@/services/treeService';
import { walletService } from '@/services/walletService';
import { Badge } from '@/components/ui/Badge';
import type { MyConnections } from '@/types/tree.types';
import type { Wallet, WalletTransaction } from '@/types/wallet.types';

type Tab = 'account' | 'wallet' | 'orders' | 'shop';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

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

function TxnRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.type === 'credit';
  const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(txn.created_at));
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate">{txn.reason}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <span className={`ml-4 font-semibold tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {isCredit ? '+' : '-'}&#8377;{txn.amount}
      </span>
    </div>
  );
}

export function UserDashboard() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const { theme, toggleTheme }          = useTheme();
  const navigate                         = useNavigate();
  const [tab, setTab]                    = useState<Tab>('account');
  const [copied, setCopied]              = useState(false);
  const [connections, setConnections]    = useState<MyConnections | null>(null);

  // Wallet state
  const [wallet, setWallet]             = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [txnPage, setTxnPage]           = useState(1);
  const [txnNext, setTxnNext]           = useState<string | null>(null);
  const [extraTxns, setExtraTxns]       = useState<WalletTransaction[]>([]);
  const [loadingMore, setLoadingMore]   = useState(false);

  const referralUrl = `${window.location.origin}/register?ref=${user?.upa_id ?? ''}`;

  useEffect(() => {
    authService.getMe().then((r) => updateUser(r.data)).catch(() => {});
    treeService.getMyConnections().then((r) => setConnections(r.data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch wallet data when tab becomes active
  useEffect(() => {
    if (tab !== 'wallet' || wallet) return;
    setWalletLoading(true);
    walletService.getMyWallet()
      .then((r) => setWallet(r.data))
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, [tab, wallet]);

  const handleLoadMore = async () => {
    const nextPage = txnPage + 1;
    setLoadingMore(true);
    try {
      const r = await walletService.getMyTransactions(nextPage);
      setExtraTxns((prev) => [...prev, ...r.data.results]);
      setTxnNext(r.data.next);
      setTxnPage(nextPage);
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };

  // Initialise txnNext from first-page meta once wallet loads
  useEffect(() => {
    if (!wallet) return;
    // wallet.transactions already has last 20; load more uses my-transactions
    // Prime the "next" state by fetching page 1 of my-transactions meta
    walletService.getMyTransactions(1).then((r) => {
      setTxnNext(r.data.next);
    }).catch(() => {});
  }, [wallet]);

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

  const allTxns = wallet ? [...wallet.transactions, ...extraTxns] : [];
  const lastUpdated = wallet
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(wallet.updated_at))
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-4">
          <span className="font-bold text-foreground">MyApp</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={toggleTheme} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            {user?.upa_id && (
              <span className="hidden sm:inline rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono">
                {user.upa_id}
              </span>
            )}
            {user?.wallet_balance !== null && user?.wallet_balance !== undefined && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                &#8377;{user.wallet_balance}
              </span>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto flex max-w-5xl gap-0 border-t px-4 overflow-x-auto scrollbar-none">
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
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Mobile: </span><span className="font-mono">{user?.mobile || '—'}</span></div>
                    <div>
                      <span className="text-muted-foreground">UPA ID: </span><span className="font-mono text-purple-700 dark:text-purple-400">{user?.upa_id || '—'}</span>
                      <div className="mt-1">
                        <Badge variant="secondary">
                          {connections?.depth_level == null || connections.depth_level === 0 ? 'Root' : `Level ${connections.depth_level}`}
                        </Badge>
                      </div>
                    </div>
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
              {/* Parent row */}
              <div className="mb-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Parent: </span>
                {user?.upa_parent
                  ? <><span className="font-medium text-foreground">{user.upa_parent.name}</span>
                      <span className="ml-2 font-mono text-xs text-purple-700 dark:text-purple-400">{user.upa_parent.upa_id}</span></>
                  : <span className="font-medium text-foreground">—</span>
                }
              </div>
              {/* 3 legs */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <LegCard label="Left"   user={user?.upa_legs?.L ?? null} referralUrl={referralUrl} />
                <LegCard label="Middle" user={user?.upa_legs?.M ?? null} referralUrl={referralUrl} />
                <LegCard label="Right"  user={user?.upa_legs?.R ?? null} referralUrl={referralUrl} />
              </div>
            </div>
          </div>
        )}

        {/* Wallet tab */}
        {tab === 'wallet' && (
          <div className="space-y-4">
            {/* Balance card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              {walletLoading ? (
                <>
                  <Skeleton className="h-3 w-28 mb-3" />
                  <Skeleton className="h-9 w-40" />
                </>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    &#8377;{wallet?.balance ?? '0.00'}
                  </p>
                  {lastUpdated && (
                    <p className="mt-1 text-xs text-muted-foreground">Last updated {lastUpdated}</p>
                  )}
                </>
              )}
            </div>

            {/* Transactions */}
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="font-semibold text-foreground">Transactions</h3>
              </div>

              {walletLoading ? (
                <div className="space-y-1 px-5 py-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : allTxns.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <div className="px-5">
                  {allTxns.map((txn) => <TxnRow key={txn.id} txn={txn} />)}
                </div>
              )}

              {/* Load more */}
              {!walletLoading && txnNext && (
                <div className="border-t px-5 py-3">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
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
