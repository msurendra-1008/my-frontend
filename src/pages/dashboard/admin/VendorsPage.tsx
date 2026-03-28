import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import { cn } from '@utils/cn';
import type { VendorListItem, VendorAdminDetail, VendorStats, VendorStatus } from '@/types/vendor.types';
import type { Category } from '@/types/product.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

const STATUS_STYLES: Record<VendorStatus, string> = {
  pending:       'bg-amber-100 text-amber-800 border-amber-300',
  approved:      'bg-green-100 text-green-800 border-green-300',
  rejected:      'bg-red-100 text-red-800 border-red-300',
  docs_requested:'bg-blue-100 text-blue-800 border-blue-300',
};

const STATUS_LABELS: Record<VendorStatus, string> = {
  pending:       'Pending',
  approved:      'Approved',
  rejected:      'Rejected',
  docs_requested:'Docs Requested',
};

function StatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── AlertDialog ───────────────────────────────────────────────────────────────

type DialogType = 'approve' | 'reject' | 'request_docs' | 'revoke';

function ActionAlertDialog({
  type,
  notes,
  acting,
  onNotesChange,
  onConfirm,
  onCancel,
}: {
  type:         DialogType;
  notes:        string;
  acting:       boolean;
  onNotesChange:(v: string) => void;
  onConfirm:    () => void;
  onCancel:     () => void;
}) {
  const notesOk = notes.trim().length >= 10;

  const cfg = {
    approve: {
      title:        'Approve this vendor?',
      body:         'Vendor will be notified and gain access to their dashboard.',
      btnLabel:     'Approve',
      btnClass:     'bg-green-600 hover:bg-green-700 text-white',
      notesRequired: false,
    },
    reject: {
      title:        'Reject this vendor?',
      body:         'Provide a rejection reason. Vendor will see this in their dashboard.',
      btnLabel:     'Reject',
      btnClass:     'bg-destructive hover:bg-destructive/90 text-white',
      notesRequired: true,
    },
    request_docs: {
      title:        'Request additional documents?',
      body:         'Provide a note explaining what documents are needed. Vendor will see this note.',
      btnLabel:     'Send Request',
      btnClass:     'bg-blue-600 hover:bg-blue-700 text-white',
      notesRequired: true,
    },
    revoke: {
      title:        'Revoke vendor approval?',
      body:         'Vendor will lose dashboard access. Provide a reason.',
      btnLabel:     'Revoke',
      btnClass:     'bg-destructive hover:bg-destructive/90 text-white',
      notesRequired: true,
    },
  }[type];

  const confirmDisabled = acting || (cfg.notesRequired && !notesOk);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">{cfg.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{cfg.body}</p>

        {cfg.notesRequired && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              {type === 'request_docs' ? 'Note for vendor' : 'Reason'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Min 10 characters…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{notes.length} / 500</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={acting}>Cancel</Button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
              cfg.btnClass,
            )}
          >
            {acting ? 'Processing…' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vendor Detail Sheet ───────────────────────────────────────────────────────

function VendorDetailSheet({
  vendorId,
  onClose,
  onUpdated,
}: {
  vendorId: string;
  onClose:  () => void;
  onUpdated:() => void;
}) {
  const [vendor, setVendor] = useState<VendorAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog]   = useState<DialogType | null>(null);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const { show, msg } = useToast();
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await vendorService.adminGet(vendorId);
      setVendor(res.data);
      setInternalNotes(res.data.admin_notes ?? '');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!vendor || !dialog) return;
    setActing(true);
    try {
      if (dialog === 'approve' || dialog === 'revoke') {
        if (dialog === 'approve') {
          await vendorService.approve(vendor.id);
        } else {
          await vendorService.reject(vendor.id, notes);
        }
      } else if (dialog === 'reject') {
        await vendorService.reject(vendor.id, notes);
      } else if (dialog === 'request_docs') {
        await vendorService.requestDocs(vendor.id, notes);
      }
      show(`Action completed.`);
      setDialog(null);
      setNotes('');
      await load();
      onUpdated();
    } catch {
      show('Action failed. Please try again.', true);
    } finally {
      setActing(false);
    }
  };

  const saveNotes = async (value: string) => {
    if (!vendor) return;
    await vendorService.updateAdminNotes(vendor.id, value);
  };

  const handleNotesBlur = () => {
    if (vendor) saveNotes(internalNotes);
  };

  const handleNotesChange = (v: string) => {
    setInternalNotes(v);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(v), 1500);
  };

  const status = vendor?.status;
  const isPendingOrDocs = status === 'pending' || status === 'docs_requested';
  const isApproved      = status === 'approved';
  const isRejected      = status === 'rejected';

  return (
    <>
      {dialog && vendor && (
        <ActionAlertDialog
          type={dialog}
          notes={notes}
          acting={acting}
          onNotesChange={setNotes}
          onConfirm={handleAction}
          onCancel={() => { setDialog(null); setNotes(''); }}
        />
      )}

      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative flex w-full max-w-lg flex-col overflow-y-auto bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{vendor?.company_name ?? 'Loading…'}</h2>
                {vendor && <StatusBadge status={vendor.status} />}
              </div>
              {vendor && (
                <p className="text-xs text-muted-foreground">
                  Registered {formatDate(vendor.created_at)}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : vendor ? (
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Toast */}
              {msg && (
                <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>
                  {msg.text}
                </div>
              )}

              {/* Company info */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Company</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">GST Number</dt><dd>{vendor.gst_number}</dd></div>
                  <div>
                    <dt className="text-muted-foreground">Categories</dt>
                    <dd>{vendor.categories.map((c) => c.name).join(', ') || '—'}</dd>
                  </div>
                </dl>
              </section>

              {/* Contact */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Name</dt><dd>{vendor.contact_name}</dd></div>
                  <div><dt className="text-muted-foreground">Mobile</dt><dd>{vendor.mobile || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground">Email</dt><dd>{vendor.email || '—'}</dd></div>
                </dl>
              </section>

              {/* Address */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Address</h3>
                <p className="text-sm">
                  {vendor.address_line1}
                  {vendor.address_line2 ? `, ${vendor.address_line2}` : ''},{' '}
                  {vendor.city}, {vendor.state} — {vendor.pincode}
                </p>
              </section>

              {/* Documents */}
              {vendor.documents.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documents</h3>
                  <ul className="divide-y rounded-md border">
                    {vendor.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{doc.label}</span>
                        <a
                          href={doc.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Admin notes (internal) */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Internal Notes
                </h3>
                <textarea
                  value={internalNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={3}
                  placeholder="Internal notes (not visible to vendor)…"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </section>

              {/* Action buttons */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {isPendingOrDocs && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => { setNotes(''); setDialog('approve'); }}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setNotes(''); setDialog('reject'); }}
                      >
                        ✕ Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => { setNotes(''); setDialog('request_docs'); }}
                      >
                        ? Request Docs
                      </Button>
                    </>
                  )}
                  {isApproved && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => { setNotes(''); setDialog('revoke'); }}
                    >
                      ✕ Revoke Approval
                    </Button>
                  )}
                  {isRejected && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { setNotes(''); setDialog('approve'); }}
                    >
                      ✓ Re-approve
                    </Button>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold', color ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminVendorsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendors, setVendors]         = useState<VendorListItem[]>([]);
  const [stats, setStats]             = useState<VendorStats | null>(null);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories]   = useState<Category[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const { msg, show } = useToast();

  const fetchVendors = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search)         params.search   = search;
      if (statusFilter)   params.status   = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await vendorService.adminList(params);
      setVendors(res.data.results);
      setTotal(res.data.count);
      setStats(res.data.stats);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { fetchVendors(1); }, [fetchVendors]);

  useEffect(() => {
    productService.listCategories().then((r) => setCategories(r.data.results));
  }, []);

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Vendors</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {msg && (
            <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>
              {msg.text}
            </div>
          )}

          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Vendors</h1>
            <p className="text-sm text-muted-foreground">Manage vendor registrations and approvals</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              <StatCard label="Total"          value={stats.total} />
              <StatCard label="Pending"        value={stats.pending}       color="text-amber-600" />
              <StatCard label="Approved"       value={stats.approved}      color="text-green-600" />
              <StatCard label="Rejected"       value={stats.rejected}      color="text-red-600" />
              <StatCard label="Docs Requested" value={stats.docs_requested} color="text-blue-600" />
            </div>
          )}

          {/* Filters */}
          <div className="mb-4">
            <FilterToolbar
              searchPlaceholder="Search by company, mobile, email, GST…"
              searchValue={search}
              onSearchChange={(v) => setSearch(v)}
              filters={[
                {
                  id: 'status',
                  placeholder: 'All Statuses',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { label: 'Pending',        value: 'pending' },
                    { label: 'Approved',       value: 'approved' },
                    { label: 'Rejected',       value: 'rejected' },
                    { label: 'Docs Requested', value: 'docs_requested' },
                  ],
                  width: 'w-[160px]',
                },
                {
                  id: 'category',
                  placeholder: 'All Categories',
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                  options: categories.map((c) => ({ label: c.name, value: c.id })),
                  width: 'w-[160px]',
                },
              ]}
              resultCount={{ showing: vendors.length, total, label: 'vendors' }}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">GST Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categories</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registered</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No vendors found
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => {
                    const cats = v.category_names;
                    const catDisplay = cats.length <= 2
                      ? cats.join(', ')
                      : `${cats.slice(0, 2).join(', ')} +${cats.length - 2} more`;
                    return (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{v.company_name}</td>
                        <td className="px-4 py-3">
                          <div>{v.contact_name}</div>
                          <div className="text-xs text-muted-foreground">{v.mobile || v.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{v.gst_number ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{catDisplay || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(v.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedId(v.id)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            View <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => fetchVendors(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => fetchVendors(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Sheet */}
      {selectedId && (
        <VendorDetailSheet
          vendorId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {
            show('Vendor updated.');
            fetchVendors(page);
          }}
        />
      )}
    </div>
  );
}
