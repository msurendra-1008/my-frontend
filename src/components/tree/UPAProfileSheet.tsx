import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@utils/cn';
import { treeService } from '@/services/treeService';
import type { UPAProfile } from '@/types/tree.types';

interface Props {
  upaId:   string | null;
  onClose: () => void;
  onToggled?: (upaId: string, isActive: boolean) => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function UPAProfileSheet({ upaId, onClose, onToggled }: Props) {
  const open = !!upaId;

  const [profile,  setProfile]  = useState<UPAProfile | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);

  useEffect(() => {
    if (!upaId) { setProfile(null); return; }
    setLoading(true);
    treeService.getProfile(upaId)
      .then((r) => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [upaId]);

  const handleToggle = async () => {
    if (!profile) return;
    setToggling(true);
    try {
      const r = await treeService.toggleActive(profile.upa_id);
      setProfile((p) => p ? { ...p, is_active: r.data.is_active } : p);
      setToast(r.data.message);
      onToggled?.(profile.upa_id, r.data.is_active);
      setTimeout(() => setToast(null), 3000);
    } catch { /* ignore */ } finally {
      setToggling(false);
      setConfirm(false);
    }
  };

  const joinDate = profile?.joined_at
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(profile.joined_at))
    : '—';

  const initials = profile
    ? profile.name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={cn(
        'fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-card shadow-xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b px-5">
          <h2 className="text-sm font-semibold text-foreground">UPA Member Profile</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : profile ? (
            <>
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {initials || '?'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile.name}</p>
                  <p className="font-mono text-xs text-purple-700 dark:text-purple-400">{profile.upa_id}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      profile.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', profile.is_active ? 'bg-emerald-500' : 'bg-red-400')} />
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      Level {profile.depth_level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                <Row label="Mobile"   value={profile.mobile || '—'} />
                <Row label="Joined"   value={joinDate} />
                <Row label="Wallet"   value={`₹${profile.wallet_balance}`} mono />
                <Row label="Sponsor"  value={profile.parent_upa_id || 'Root user — no parent'} mono={!!profile.parent_upa_id} />
              </div>

              {/* Legs */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legs</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['L', 'M', 'R'] as const).map((leg) => {
                    const legLabels = { L: 'Left', M: 'Middle', R: 'Right' };
                    const child = profile.children_summary[leg];
                    return (
                      <div key={leg} className={cn(
                        'rounded-lg border p-3',
                        child
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                          : 'border-dashed',
                      )}>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">{legLabels[leg]}</p>
                        {child ? (
                          <>
                            <p className="mt-0.5 text-xs font-medium text-foreground truncate">{child.name}</p>
                            <p className="font-mono text-[10px] text-purple-700 dark:text-purple-400">{child.upa_id}</p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-muted-foreground">Vacant</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load profile.</p>
          )}
        </div>

        {/* Footer — toggle button */}
        {profile && (
          <div className="shrink-0 border-t p-4">
            {!confirm ? (
              <button
                onClick={() => setConfirm(true)}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  profile.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800',
                )}
              >
                {profile.is_active ? 'Deactivate User' : 'Activate User'}
              </button>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Are you sure you want to {profile.is_active ? 'deactivate' : 'activate'}{' '}
                    <strong>{profile.name}</strong>?
                    {profile.is_active && ' They will not be able to login.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirm(false)}
                    className="flex-1 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors',
                      profile.is_active
                        ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                        : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400',
                    )}
                  >
                    {toggling ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] rounded-lg border bg-card px-4 py-3 shadow-lg text-sm text-foreground animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}
