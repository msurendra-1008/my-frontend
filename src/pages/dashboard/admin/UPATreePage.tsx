import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Search, Sun, Moon } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { TreeNodeCard } from '@/components/tree/TreeNodeCard';
import { UPAProfileSheet } from '@/components/tree/UPAProfileSheet';
import { useTheme } from '@context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { treeService } from '@/services/treeService';
import type { TreeNode, UPASearchResult, TreeStats } from '@/types/tree.types';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ?? 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export function UPATreePage() {
  const { theme, toggleTheme } = useTheme();
  useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stats
  const [stats, setStats]     = useState<TreeStats | null>(null);

  // Browse
  const [nodes, setNodes]     = useState<TreeNode[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseNext, setBrowseNext]       = useState<string | null>(null);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);

  // Search
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UPASearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Profile sheet
  const [profileUpaId, setProfileUpaId] = useState<string | null>(null);

  useEffect(() => {
    treeService.getStats().then((r) => setStats(r.data)).catch(() => {});
    treeService.browse().then((r) => {
      setNodes(r.data.results);
      setBrowseNext(r.data.next);
    }).catch(() => {}).finally(() => setBrowseLoading(false));
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      treeService.search(q)
        .then((r) => setResults(r.data.results))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 400);
  }, []);

  const loadMore = async () => {
    if (!browseNext || browseLoadingMore) return;
    setBrowseLoadingMore(true);
    try {
      // Extract page number from next URL
      const url = new URL(browseNext, window.location.origin);
      const page = Number(url.searchParams.get('page') ?? 2);
      const r = await treeService.browse(page);
      setNodes((prev) => [...prev, ...r.data.results]);
      setBrowseNext(r.data.next);
    } catch { /* ignore */ } finally {
      setBrowseLoadingMore(false);
    }
  };

  const showSearch = !!query.trim();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen((o) => !o)}>
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-foreground">UPA Tree</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total UPA Users" value={stats?.total_upa_users ?? '—'} />
            <StatCard label="Active"          value={stats?.active ?? '—'}          accent="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Inactive"        value={stats?.inactive ?? '—'}        accent="text-red-500 dark:text-red-400" />
            <StatCard label="Placed in Tree"  value={stats?.placed_in_tree ?? '—'} accent="text-purple-700 dark:text-purple-400" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by UPA ID, name or mobile…"
              className="h-9 w-full rounded-lg border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Search results */}
          {showSearch && (
            <div className="space-y-2">
              {searching ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl border bg-card" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No results found.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setProfileUpaId(r.upa_id)}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm hover:bg-muted/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground">
                      {r.name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{r.name}</p>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          L{r.depth_level}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {r.legs_filled}/3 legs
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="font-mono text-xs text-purple-700 dark:text-purple-400">{r.upa_id}</p>
                        {r.mobile && <p className="text-xs text-muted-foreground">{r.mobile}</p>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Tree browser */}
          {!showSearch && (
            <div className="space-y-5">
              {browseLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-xl border bg-card" />
                  ))}
                </div>
              ) : nodes.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No UPA tree nodes yet.</p>
              ) : (
                <>
                  {nodes.map((node) => (
                    <TreeNodeCard
                      key={node.id}
                      node={node}
                      depth={0}
                      onViewProfile={setProfileUpaId}
                    />
                  ))}
                  {browseNext && (
                    <button
                      onClick={loadMore}
                      disabled={browseLoadingMore}
                      className="w-full rounded-xl border bg-card py-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      {browseLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Profile slide-over */}
      <UPAProfileSheet
        upaId={profileUpaId}
        onClose={() => setProfileUpaId(null)}
        onToggled={(upaId, isActive) => {
          // Update node in browse list if present
          setNodes((prev) =>
            prev.map((n) => n.upa_id === upaId ? { ...n, is_active: isActive } : n),
          );
          // Refresh stats
          treeService.getStats().then((r) => setStats(r.data)).catch(() => {});
        }}
      />
    </div>
  );
}
