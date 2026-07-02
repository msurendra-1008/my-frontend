import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryZone, DeliveryPartner, DeliverySettings, MonthlyLedger } from '@/types/delivery.types';
import axiosInstance from '@/utils/axiosInstance';
import {
  Settings, MapPin, Users, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/* ── Types ── */
type Tab = 'settings' | 'zones' | 'partners';

/* ── Helpers ── */
function Badge({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
      green
        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
        : 'bg-red-500/10 text-red-600 dark:text-red-400',
    )}>
      {children}
    </span>
  );
}

/* ── Partner Detail Sheet ── */
function PartnerDetailSheet({ partner, onClose }: { partner: DeliveryPartner; onClose: () => void }) {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [ledger, setLedger]   = useState<MonthlyLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    deliveryService.getPartnerLedger(partner.id, year, month)
      .then(r => setLedger(r.data))
      .catch(() => setLedger(null))
      .finally(() => setLoading(false));
  }, [partner.id, year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    if (ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1)) return;
    setYear(ny); setMonth(nm);
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  async function openPdf() {
    setPdfLoading(true);
    const url = deliveryService.getPartnerMonthlyReportUrl(partner.id, year, month);
    try {
      const r = await axiosInstance.get<string>(url, { responseType: 'text' });
      const blob = new Blob([r.data], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch { /* ignore */ }
    finally { setPdfLoading(false); }
  }

  const dayTypeBg: Record<string, string> = {
    full:   'bg-green-500/10 border-green-400/40 text-green-600 dark:text-green-400',
    half:   'bg-amber-500/10 border-amber-400/40 text-amber-700 dark:text-amber-400',
    absent: 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="w-full max-w-md flex flex-col h-full bg-card border-l border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">{partner.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {partner.vehicle_type}{partner.vehicle_number ? ` · ${partner.vehicle_number}` : ''}
              {partner.mobile ? ` · ${partner.mobile}` : partner.email ? ` · ${partner.email}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge green={partner.is_active}>{partner.is_active ? 'Active' : 'Inactive'}</Badge>
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                partner.is_on_duty
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground',
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', partner.is_on_duty ? 'bg-green-500' : 'bg-muted-foreground/50')} />
                {partner.is_on_duty ? 'On Duty' : 'Off Duty'}
              </span>
              <span className="text-xs text-muted-foreground">{partner.active_assignments} active job{partner.active_assignments !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
            <X size={16} />
          </button>
        </div>

        {/* Month picker + PDF */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-foreground w-32 text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30">
              <ChevronRight size={15} />
            </button>
          </div>
          <button
            onClick={openPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-50"
          >
            <ExternalLink size={12} /> {pdfLoading ? 'Opening…' : 'PDF Report'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}

          {ledger && !loading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Full Days',   value: ledger.full_days,   color: 'text-green-600 dark:text-green-400' },
                  { label: 'Half Days',   value: ledger.half_days,   color: 'text-amber-700 dark:text-amber-400' },
                  { label: 'Absent Days', value: ledger.absent_days, color: 'text-red-600 dark:text-red-400' },
                  { label: 'Total Hours', value: `${ledger.total_hours.toFixed(1)}h`, color: 'text-foreground' },
                ].map(c => (
                  <div key={c.label} className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
                    <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Day-wise ledger */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                {ledger.days.filter(d => d.type !== 'future').map(day => (
                  <div key={day.date}>
                    <button
                      onClick={() => setExpanded(e => e === day.date ? null : day.date)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 text-left">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                        </span>
                        {day.type !== 'future' && (
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', dayTypeBg[day.type])}>
                            {day.type === 'full' ? 'Full' : day.type === 'half' ? 'Half' : 'Absent'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {day.hours != null ? `${day.hours.toFixed(1)}h` : '—'}
                        </span>
                        {day.sessions.length > 0 && (
                          <ChevronDown size={13} className={cn('text-muted-foreground transition-transform', expanded === day.date && 'rotate-180')} />
                        )}
                      </div>
                    </button>
                    {expanded === day.date && day.sessions.length > 0 && (
                      <div className="px-4 py-2.5 bg-muted/20 border-b border-border/30 space-y-1.5">
                        {day.sessions.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock size={11} />
                              <span>
                                {s.start} – {s.end ?? (
                                  <span className="text-green-600 dark:text-green-400">Ongoing</span>
                                )}
                              </span>
                            </div>
                            <span className="text-foreground font-medium">{s.duration.toFixed(2)}h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export function DeliverySettingsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab]               = useState<Tab>('settings');

  // Settings state
  const [settings, setSettings]     = useState<DeliverySettings | null>(null);
  const [savingSettings, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<{
    auto_assign: boolean;
    assignment_mode: 'manual' | 'suggested' | 'automatic';
    default_proof_type: 'photo' | 'otp' | 'either';
    max_orders_per_partner: number;
  }>({ auto_assign: true, assignment_mode: 'manual', default_proof_type: 'either', max_orders_per_partner: 8 });

  // Zones state
  const [zones, setZones]           = useState<DeliveryZone[]>([]);
  const [zoneForm, setZoneForm]     = useState({ name: '', pincodes: '', is_active: true });
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneSaving, setZoneSaving] = useState(false);

  // Partners state
  const [partners, setPartners]     = useState<DeliveryPartner[]>([]);
  const [partnerForm, setPartnerForm] = useState<{ user: string; vehicle_type: 'bike' | 'scooter' | 'car' | 'van' | 'other'; vehicle_number: string; zone_ids: string[] }>({ user: '', vehicle_type: 'bike', vehicle_number: '', zone_ids: [] });
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [detailPartner, setDetailPartner] = useState<DeliveryPartner | null>(null);

  const [error, setError] = useState('');

  // Employee picker for new partner
  const [empSearch,     setEmpSearch]     = useState('');
  const [empResults,    setEmpResults]    = useState<any[]>([]);
  const [empSearching,  setEmpSearching]  = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null); // user UUID

  useEffect(() => {
    loadSettings();
    loadZones();
    loadPartners();
  }, []);

  function loadSettings() {
    deliveryService.getSettings().then(r => {
      setSettings(r.data);
      const VALID_MODES: Array<'manual' | 'suggested' | 'automatic'> = ['manual', 'suggested', 'automatic'];
      const VALID_PROOFS: Array<'photo' | 'otp' | 'either'> = ['photo', 'otp', 'either'];
      setSettingsForm({
        auto_assign:            r.data.auto_assign,
        assignment_mode:        VALID_MODES.includes(r.data.assignment_mode) ? r.data.assignment_mode : 'manual',
        default_proof_type:     VALID_PROOFS.includes(r.data.default_proof_type) ? r.data.default_proof_type : 'either',
        max_orders_per_partner: r.data.max_orders_per_partner ?? 8,
      });
    }).catch(() => {});
  }

  function loadZones() {
    deliveryService.getZones().then(r => setZones(r.data.results ?? [])).catch(() => {});
  }

  function loadPartners() {
    deliveryService.getPartners().then(r => setPartners(r.data.results ?? [])).catch(() => {});
  }

  async function searchEmployees(query: string) {
    setEmpSearching(true);
    try {
      const res = await axiosInstance.get('/api/v1/hr/employees/', {
        params: { search: query, page_size: 20 },
      });
      setEmpResults(res.data.results ?? []);
    } catch { setEmpResults([]); }
    finally { setEmpSearching(false); }
  }

  async function saveSettings() {
    setSaving(true);
    setError('');
    try {
      const r = await deliveryService.updateSettings(settingsForm);
      setSettings(r.data);
    } catch { setError('Failed to save settings.'); }
    finally { setSaving(false); }
  }

  function openZoneModal(zone?: DeliveryZone) {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ name: zone.name, pincodes: zone.pincodes, is_active: zone.is_active });
    } else {
      setEditingZone(null);
      setZoneForm({ name: '', pincodes: '', is_active: true });
    }
    setShowZoneModal(true);
    setError('');
  }

  async function saveZone() {
    setZoneSaving(true);
    setError('');
    try {
      if (editingZone) {
        await deliveryService.updateZone(editingZone.id, zoneForm);
      } else {
        await deliveryService.createZone(zoneForm);
      }
      setShowZoneModal(false);
      loadZones();
    } catch { setError('Failed to save zone.'); }
    finally { setZoneSaving(false); }
  }

  async function deleteZone(id: string) {
    if (!confirm('Delete this zone?')) return;
    try {
      await deliveryService.deleteZone(id);
      loadZones();
    } catch { setError('Failed to delete zone.'); }
  }

  function openPartnerModal(partner?: DeliveryPartner) {
    setEmpSearch(''); setEmpResults([]); setSelectedEmpId(null); setEmpSearching(false);
    if (partner) {
      setEditingPartner(partner);
      setPartnerForm({
        user: partner.user,
        vehicle_type: partner.vehicle_type,
        vehicle_number: partner.vehicle_number,
        zone_ids: partner.zones.map(z => z.id),
      });
    } else {
      setEditingPartner(null);
      setPartnerForm({ user: '', vehicle_type: 'bike', vehicle_number: '', zone_ids: [] });
      searchEmployees('');
    }
    setShowPartnerModal(true);
    setError('');
  }

  async function savePartner() {
    if (!editingPartner && !partnerForm.user) {
      setError('Please select an employee.');
      return;
    }
    setPartnerSaving(true);
    setError('');
    try {
      if (editingPartner) {
        await deliveryService.updatePartner(editingPartner.id, partnerForm);
      } else {
        await deliveryService.createPartner(partnerForm);
      }
      setShowPartnerModal(false);
      loadPartners();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.user?.[0] || 'Failed to save partner.');
    }
    finally { setPartnerSaving(false); }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'settings', label: 'Settings',  icon: <Settings size={14} /> },
    { key: 'zones',    label: 'Zones',     icon: <MapPin size={14} /> },
    { key: 'partners', label: 'Partners',  icon: <Users size={14} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/50 bg-card px-6 py-3 flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground">Delivery Management</h1>
          <p className="text-xs text-muted-foreground">Configure zones, partners and auto-assignment</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border/50 mb-6">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 pb-2 text-sm transition-colors border-b-2 -mb-px',
                  tab === t.key
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Settings Tab ── */}
          {tab === 'settings' && (
            <div className="max-w-md space-y-4">
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
                <h2 className="text-sm font-medium text-foreground">Auto Assignment</h2>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setSettingsForm(f => ({ ...f, auto_assign: !f.auto_assign }))}
                    className={cn(
                      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
                      settingsForm.auto_assign ? 'bg-primary' : 'bg-muted',
                    )}
                  >
                    <span className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                      settingsForm.auto_assign ? 'translate-x-4' : 'translate-x-0.5',
                    )} />
                  </button>
                  <span className="text-sm text-foreground">Auto-assign delivery partner when order is packed</span>
                </label>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Assignment Mode</label>
                  <select
                    value={settingsForm.assignment_mode}
                    onChange={e => setSettingsForm(f => ({ ...f, assignment_mode: e.target.value as 'manual' | 'suggested' | 'automatic' }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="manual">Manual — I'll assign every order myself</option>
                    <option value="suggested">Suggested — System suggests, I confirm</option>
                    <option value="automatic">Automatic — System assigns instantly</option>
                  </select>
                </div>
              </div>

              {/* Proof of Delivery */}
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 mt-4">
                <div>
                  <h2 className="text-sm font-medium text-foreground">Proof of Delivery</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">What delivery partners must provide to confirm delivery</p>
                </div>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {([
                    { value: 'photo',  label: 'Photo only' },
                    { value: 'otp',    label: 'OTP only' },
                    { value: 'either', label: 'Either' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettingsForm(f => ({ ...f, default_proof_type: opt.value }))}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium transition-colors border-r border-border last:border-r-0',
                        settingsForm.default_proof_type === opt.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity */}
              <div className="rounded-lg border border-border/50 bg-card p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">Max Orders per Partner</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Default capacity limit per delivery partner</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={settingsForm.max_orders_per_partner}
                    onChange={e => setSettingsForm(f => ({ ...f, max_orders_per_partner: Number(e.target.value) }))}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {savingSettings ? 'Saving…' : 'Save Settings'}
                </button>
              </div>

              {settings && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(settings.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* ── Zones Tab ── */}
          {tab === 'zones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => openZoneModal()}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <Plus size={12} /> Add Zone
                </button>
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Pincodes</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {zones.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No zones yet</td></tr>
                    )}
                    {zones.map(zone => (
                      <tr key={zone.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{zone.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs font-mono">{zone.pincodes}</td>
                        <td className="px-4 py-2.5"><Badge green={zone.is_active}>{zone.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openZoneModal(zone)} className="p-1 text-muted-foreground hover:text-foreground">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteZone(zone.id)} className="p-1 text-muted-foreground hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Partners Tab ── */}
          {tab === 'partners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{partners.length} partner{partners.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => openPartnerModal()}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <Plus size={12} /> Add Partner
                </button>
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Vehicle</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Zones</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Duty</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {partners.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No partners yet</td></tr>
                    )}
                    {partners.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setDetailPartner(p)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-foreground">{p.full_name}</div>
                          <div className="text-xs text-muted-foreground">{p.mobile || p.email}</div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground capitalize">{p.vehicle_type} {p.vehicle_number && `· ${p.vehicle_number}`}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.zones.map(z => z.name).join(', ') || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            p.is_on_duty
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground',
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', p.is_on_duty ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                            {p.is_on_duty ? 'On Duty' : 'Off Duty'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><Badge green={p.is_active}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openPartnerModal(p)} className="p-1 text-muted-foreground hover:text-foreground">
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Zone Modal ── */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">{editingZone ? 'Edit Zone' : 'New Zone'}</h2>
              <button onClick={() => setShowZoneModal(false)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Zone Name</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  value={zoneForm.name}
                  onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. North Delhi"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pincodes (comma-separated)</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  rows={2}
                  value={zoneForm.pincodes}
                  onChange={e => setZoneForm(f => ({ ...f, pincodes: e.target.value }))}
                  placeholder="110001, 110002, 110003"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zoneForm.is_active}
                  onChange={e => setZoneForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowZoneModal(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button onClick={saveZone} disabled={zoneSaving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {zoneSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Partner Detail Sheet ── */}
      {detailPartner && (
        <PartnerDetailSheet partner={detailPartner} onClose={() => setDetailPartner(null)} />
      )}

      {/* ── Partner Modal ── */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">{editingPartner ? 'Edit Partner' : 'Add Delivery Partner'}</h2>
              <button onClick={() => setShowPartnerModal(false)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              {!editingPartner && (
                <div className="relative">
                  <label className="text-xs text-muted-foreground block mb-1">Employee *</label>
                  {selectedEmpId ? (
                    <div className="flex items-center gap-2 rounded-md border border-green-400/40 bg-green-500/10 px-3 py-2">
                      <Check size={13} className="shrink-0 text-green-600 dark:text-green-400" />
                      <span className="flex-1 text-sm text-green-600 dark:text-green-400">{empSearch}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(null);
                          setEmpSearch('');
                          setPartnerForm(f => ({ ...f, user: '' }));
                          searchEmployees('');
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={empSearch}
                        onChange={e => {
                          setEmpSearch(e.target.value);
                          setPartnerForm(f => ({ ...f, user: '' }));
                          searchEmployees(e.target.value);
                        }}
                        placeholder="Search by name or employee code…"
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {(empResults.length > 0 || empSearching) && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-card border border-border/50 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {empSearching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
                          {empResults.map((emp: any) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setSelectedEmpId(emp.user);
                                setPartnerForm(f => ({ ...f, user: emp.user }));
                                setEmpSearch(`${emp.full_name} (${emp.employee_code})`);
                                setEmpResults([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 border-b border-border/30 last:border-0"
                            >
                              <p className="font-medium text-foreground">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {emp.employee_code}{emp.designation ? ` · ${emp.designation}` : ''} · {emp.department_name || 'No dept'}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Vehicle Type</label>
                <select
                  value={partnerForm.vehicle_type}
                  onChange={e => setPartnerForm(f => ({ ...f, vehicle_type: e.target.value as 'bike' | 'scooter' | 'car' | 'van' | 'other' }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {(['bike', 'scooter', 'car', 'van', 'other'] as const).map(v => (
                    <option key={v} value={v} className="capitalize">{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Vehicle Number</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  value={partnerForm.vehicle_number}
                  onChange={e => setPartnerForm(f => ({ ...f, vehicle_number: e.target.value }))}
                  placeholder="DL 01 AA 1234"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assign Zones</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-border/50 rounded p-2">
                  {zones.map(z => (
                    <label key={z.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={partnerForm.zone_ids.includes(z.id)}
                        onChange={e => {
                          setPartnerForm(f => ({
                            ...f,
                            zone_ids: e.target.checked
                              ? [...f.zone_ids, z.id]
                              : f.zone_ids.filter(id => id !== z.id),
                          }));
                        }}
                      />
                      <span className="text-sm text-foreground">{z.name}</span>
                    </label>
                  ))}
                  {zones.length === 0 && <p className="text-xs text-muted-foreground">No zones available</p>}
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPartnerModal(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button onClick={savePartner} disabled={partnerSaving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {partnerSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
