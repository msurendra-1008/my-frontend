import { useState, useEffect } from 'react'
import { Menu, Sun, Moon, Plus, Pencil, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import type { DiscountCode } from '@/types/billing.types'

function roleBadgeVariant(role: string) {
  if (role === 'superadmin') return 'danger' as const
  if (role === 'admin')      return 'warning' as const
  return 'info' as const
}

interface CodeForm {
  code:       string
  type:       'percent' | 'flat'
  value:      string
  max_uses:   string
  valid_till: string
  is_active:  boolean
}

const EMPTY_FORM: CodeForm = {
  code: '', type: 'percent', value: '', max_uses: '', valid_till: '', is_active: true,
}

export function DiscountCodesPage() {
  const { theme, toggleTheme } = useTheme()
  const { user }               = useAuthStore()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [codes, setCodes]           = useState<DiscountCode[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<DiscountCode | null>(null)
  const [form, setForm]             = useState<CodeForm>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [deleteId, setDeleteId]     = useState<string | null>(null)

  const fetchCodes = () => {
    setLoading(true)
    billingService.getDiscountCodes()
      .then(r => setCodes(r.data.results ?? r.data))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchCodes, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowForm(true)
  }

  const openEdit = (code: DiscountCode) => {
    setEditing(code)
    setForm({
      code:       code.code,
      type:       code.type,
      value:      code.value,
      max_uses:   String(code.max_uses),
      valid_till: code.valid_till ? code.valid_till.slice(0, 10) : '',
      is_active:  code.is_active,
    })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.value.trim()) { setSaveError('Code and value are required.'); return }
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        code:       form.code.trim().toUpperCase(),
        type:       form.type,
        value:      form.value,
        max_uses:   parseInt(form.max_uses) || 0,
        valid_till: form.valid_till || null,
        is_active:  form.is_active,
      }
      if (editing) {
        await billingService.updateDiscountCode(editing.id, payload)
      } else {
        await billingService.createDiscountCode(payload)
      }
      setShowForm(false)
      fetchCodes()
    } catch (e: any) {
      setSaveError(e?.response?.data?.detail ?? JSON.stringify(e?.response?.data) ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await billingService.deleteDiscountCode(id)
      setCodes(prev => prev.filter(c => c.id !== id))
    } catch { /* ignore */ }
    setDeleteId(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 bg-card px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden text-muted-foreground">
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-semibold text-foreground">Discount Codes</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              New Code
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user && (
              <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                {user.role}
              </Badge>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading…</div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
              <AlertCircle size={24} className="opacity-40" />
              No discount codes yet
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Value</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Uses</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Valid Till</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {codes.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground text-xs">{c.code}</td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">{c.type}</td>
                      <td className="px-3 py-2.5 text-right text-foreground">
                        {c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                        {c.used_count}{c.max_uses > 0 ? ` / ${c.max_uses}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                        {c.valid_till ? new Date(c.valid_till).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.is_valid_now ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border/50 w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <p className="font-semibold text-foreground text-sm">{editing ? 'Edit Code' : 'New Discount Code'}</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Code</label>
                  <input
                    className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                    placeholder="e.g. SAVE10"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Type</label>
                  <select
                    className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'flat' }))}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Value {form.type === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Uses (0 = unlimited)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Valid Till (optional)</label>
                  <input
                    type="date"
                    className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={form.valid_till}
                    onChange={e => setForm(f => ({ ...f, valid_till: e.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>

              {saveError && (
                <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {saveError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-9 rounded-md border border-border/60 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border/50 w-full max-w-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Delete Discount Code?</p>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 h-9 rounded-md border border-border/60 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 h-9 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
