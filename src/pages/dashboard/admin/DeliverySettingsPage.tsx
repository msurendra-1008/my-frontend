import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryZone, DeliveryPartner, DeliverySettings } from '@/types/delivery.types';
import axiosInstance from '@/utils/axiosInstance';
import { Settings, MapPin, Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

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

/* ── Main page ── */
export function DeliverySettingsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab]               = useState<Tab>('settings');

  // Settings state
  const [settings, setSettings]     = useState<DeliverySettings | null>(null);
  const [savingSettings, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ auto_assign: true, assignment_mode: 'zone_match' as 'zone_match' | 'manual' });

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
      setSettingsForm({ auto_assign: r.data.auto_assign, assignment_mode: r.data.assignment_mode });
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
                    onChange={e => setSettingsForm(f => ({ ...f, assignment_mode: e.target.value as any }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="zone_match">Zone Match (match partner's delivery zones)</option>
                    <option value="manual">Manual (any active partner)</option>
                  </select>
                </div>

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
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Active Jobs</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {partners.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No partners yet</td></tr>
                    )}
                    {partners.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-foreground">{p.full_name}</div>
                          <div className="text-xs text-muted-foreground">{p.mobile || p.email}</div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground capitalize">{p.vehicle_type} {p.vehicle_number && `· ${p.vehicle_number}`}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{p.zones.map(z => z.name).join(', ') || '—'}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{p.active_assignments}</td>
                        <td className="px-4 py-2.5"><Badge green={p.is_active}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="px-4 py-2.5 text-right">
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
