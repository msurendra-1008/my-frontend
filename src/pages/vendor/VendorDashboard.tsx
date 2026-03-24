import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, XCircle, AlertTriangle, FileText,
  LogOut, Upload, Pencil, Download, Trash2, Loader2, X,
} from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import type { VendorProfile, VendorDocument } from '@/types/vendor.types';
import type { Category } from '@/types/product.types';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:       { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved:      { label: 'Approved',       className: 'bg-green-100 text-green-800 border-green-300' },
  rejected:      { label: 'Rejected',       className: 'bg-red-100 text-red-800 border-red-300' },
  docs_requested:{ label: 'Docs Requested', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

const TABS = ['Tenders', 'Purchase Orders', 'Chat', 'Profile'] as const;
type Tab = typeof TABS[number];

// ── Stub Tables ───────────────────────────────────────────────────────────────

function TendersTab() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4">Tender ID</th>
              <th className="pb-3 pr-4">Product</th>
              <th className="pb-3 pr-4">Qty</th>
              <th className="pb-3 pr-4">Deadline</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="py-12 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-10 w-10 opacity-30" />
                No tenders assigned yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function POsTab() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4">PO Number</th>
              <th className="pb-3 pr-4">Product</th>
              <th className="pb-3 pr-4">Qty</th>
              <th className="pb-3 pr-4">Delivery Schedule</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                No purchase orders yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChatTab() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="py-12 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto mb-2 h-10 w-10 opacity-30" />
        No active negotiations
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  onRefresh,
}: {
  profile: VendorProfile;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [form, setForm] = useState({
    contact_name:  profile.contact_name,
    address_line1: profile.address_line1,
    address_line2: profile.address_line2,
    city:          profile.city,
    state:         profile.state,
    pincode:       profile.pincode,
  });
  const [saving, setSaving]       = useState(false);
  const [docLabel, setDocLabel]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    productService.listCategories().then((r) => setCategories(r.data.results));
    setSelectedCats(profile.categories.map((c) => c.id));
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorService.updateProfile({ ...form, category_ids: selectedCats });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = docLabel.trim() || file.name;
    setUploading(true);
    try {
      await vendorService.uploadDocument(label, file);
      setDocLabel('');
      onRefresh();
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleDeleteDoc = async (docId: string) => {
    await vendorService.deleteDocument(docId);
    setDeleteConfirm(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Company & Contact</h3>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Contact Person</label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Address Line 1</label>
              <Input
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Address Line 2</label>
              <Input
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">State</label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pincode</label>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCats((prev) =>
                        prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selectedCats.includes(cat.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{profile.company_name}</dd></div>
            <div><dt className="text-muted-foreground">GST Number</dt><dd className="font-medium">{profile.gst_number}</dd></div>
            <div><dt className="text-muted-foreground">Contact Person</dt><dd className="font-medium">{profile.contact_name}</dd></div>
            <div><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium">{profile.mobile || '—'}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{profile.email || '—'}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">
                {profile.address_line1}{profile.address_line2 ? `, ${profile.address_line2}` : ''},{' '}
                {profile.city}, {profile.state} — {profile.pincode}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Categories</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {profile.categories.map((c) => (
                  <span key={c.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.name}</span>
                ))}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Documents</h3>

        {profile.documents.length > 0 ? (
          <ul className="mb-4 divide-y">
            {profile.documents.map((doc: VendorDocument) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} download target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  {deleteConfirm === doc.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="danger" onClick={() => handleDeleteDoc(doc.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}

        <div className="flex gap-2">
          <Input
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            placeholder="Document name (e.g. PAN Card)"
            className="flex-1"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input type="file" className="hidden" onChange={handleUploadDoc} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function VendorDashboard() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Tenders');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await vendorService.getMe();
      setProfile(res.data);
    } catch {
      // token invalid — logout
      clearAuth();
      navigate('/vendor/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [clearAuth, navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = () => {
    clearAuth();
    navigate('/vendor/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  const badge = STATUS_BADGE[profile.status];

  // ── Status Gate ───────────────────────────────────────────────────────────

  const renderGate = () => {
    if (profile.status === 'pending') {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-amber-500" />
            <h2 className="mb-2 text-xl font-bold">Application Under Review</h2>
            <p className="text-muted-foreground">
              We're reviewing your registration. You'll be notified once approved. This usually
              takes 1–2 business days.
            </p>
            {profile.documents.length > 0 && (
              <div className="mt-6 text-left">
                <p className="mb-2 text-sm font-medium">Uploaded documents:</p>
                <ul className="space-y-1">
                  {profile.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" /> {doc.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (profile.status === 'docs_requested') {
      return (
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="font-medium text-amber-800">Admin has requested additional documents</p>
            {profile.admin_notes && (
              <p className="mt-1 text-sm text-amber-700">{profile.admin_notes}</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 font-semibold">Upload Requested Documents</h3>
            <ProfileTab profile={profile} onRefresh={fetchProfile} />
          </div>
        </div>
      );
    }

    if (profile.status === 'rejected') {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-xl font-bold">Application Rejected</h2>
            {profile.rejection_reason && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {profile.rejection_reason}
              </div>
            )}
            <p className="text-muted-foreground">
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }

    return null; // approved — render tabs
  };

  const gate = renderGate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{profile.company_name}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {/* Status gate — non-approved */}
      {gate}

      {/* Approved — full dashboard */}
      {profile.status === 'approved' && (
        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Tenders'          && <TendersTab />}
          {activeTab === 'Purchase Orders'  && <POsTab />}
          {activeTab === 'Chat'             && <ChatTab />}
          {activeTab === 'Profile'          && (
            <ProfileTab profile={profile} onRefresh={fetchProfile} />
          )}
        </main>
      )}
    </div>
  );
}
