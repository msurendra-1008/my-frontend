import { useState, useRef, useEffect } from 'react'
import { Menu, Search, Sun, Moon, Upload, X, CheckCircle, AlertCircle, Pencil } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { cn } from '@/utils/cn'
import type { OfflineBill, OfflineBillItem, BillingSettings } from '@/types/billing.types'

function roleBadgeVariant(role: string) {
  if (role === 'superadmin') return 'danger' as const
  if (role === 'admin')      return 'warning' as const
  return 'info' as const
}

interface ReturnLineItem {
  item:     OfflineBillItem
  selected: boolean
  qty:      number
}

export function BillReturnPage() {
  const { theme, toggleTheme } = useTheme()
  const { user }               = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Billing settings ──────────────────────────────────────────────────────
  const [billingSettings,  setBillingSettings]  = useState<BillingSettings | null>(null)
  const [editingSettings,  setEditingSettings]  = useState(false)
  const [settingsSaving,   setSettingsSaving]   = useState(false)
  const [settingsMsg,      setSettingsMsg]      = useState<{ text: string; err: boolean } | null>(null)
  const [settingsForm,     setSettingsForm]     = useState({
    return_window_enabled: false,
    return_window_days:    2,
  })

  useEffect(() => {
    billingService.getSettings()
      .then(res => {
        setBillingSettings(res.data)
        setSettingsForm({
          return_window_enabled: res.data.return_window_enabled,
          return_window_days:    res.data.return_window_days,
        })
      })
      .catch(() => {/* non-critical */})
  }, [])

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const res = await billingService.updateSettings(settingsForm)
      setBillingSettings(res.data)
      setEditingSettings(false)
      setSettingsMsg({ text: 'Return window settings saved', err: false })
      setTimeout(() => setSettingsMsg(null), 3500)
    } catch (e: any) {
      setSettingsMsg({
        text: e?.response?.data?.error || 'Failed to save settings',
        err:  true,
      })
      setTimeout(() => setSettingsMsg(null), 3500)
    } finally {
      setSettingsSaving(false)
    }
  }

  const cancelSettingsEdit = () => {
    setEditingSettings(false)
    if (billingSettings) {
      setSettingsForm({
        return_window_enabled: billingSettings.return_window_enabled,
        return_window_days:    billingSettings.return_window_days,
      })
    }
  }

  // ── Step 1: lookup bill ───────────────────────────────────────────────────
  const [billSearch,    setBillSearch]    = useState('')
  const [bill,          setBill]          = useState<OfflineBill | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError,   setLookupError]  = useState('')

  // ── Step 2: select items + photo ─────────────────────────────────────────
  const [lineItems,    setLineItems]    = useState<ReturnLineItem[]>([])
  const [billPhoto,    setBillPhoto]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef                         = useRef<HTMLInputElement>(null)

  // ── Submit state ─────────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success,     setSuccess]     = useState(false)

  // ── Lookup ────────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    const q = billSearch.trim()
    if (!q) return
    setLookupLoading(true)
    setLookupError('')
    setBill(null)
    setLineItems([])
    try {
      const res = await billingService.getBill(q)
      setBill(res.data)
      setLineItems(res.data.items.map(item => ({ item, selected: false, qty: 1 })))
    } catch {
      setLookupError('Bill not found. Please check the bill number.')
    } finally {
      setLookupLoading(false)
    }
  }

  // ── Photo ─────────────────────────────────────────────────────────────────
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBillPhoto(f)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const removePhoto = () => {
    setBillPhoto(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Line item helpers ─────────────────────────────────────────────────────
  const toggleItem = (idx: number) => {
    setLineItems(prev => prev.map((li, i) =>
      i === idx ? { ...li, selected: !li.selected } : li
    ))
  }

  const setItemQty = (idx: number, qty: number) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li
      const max = li.item.quantity
      return { ...li, qty: Math.min(Math.max(1, qty), max) }
    }))
  }

  const selectedItems = lineItems.filter(li => li.selected)
  const totalRefund   = selectedItems.reduce((sum, li) => {
    const perUnit = Number(li.item.line_total) / li.item.quantity
    return sum + perUnit * li.qty
  }, 0)

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!bill || selectedItems.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const fd = new FormData()
      fd.append('bill_number', bill.bill_number)
      fd.append('items', JSON.stringify(
        selectedItems.map(li => ({ order_item_id: li.item.id, qty: li.qty }))
      ))
      if (billPhoto) fd.append('bill_photo', billPhoto)
      await billingService.createReturn(fd)
      setSuccess(true)
    } catch (e: any) {
      setSubmitError(
        e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Failed to submit return request.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setBillSearch('')
    setBill(null)
    setLineItems([])
    setBillPhoto(null)
    setPhotoPreview(null)
    setSubmitError('')
    setSuccess(false)
    setLookupError('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
            <h1 className="text-sm font-semibold text-foreground">Bill Return</h1>
          </div>

          <div className="flex items-center gap-2">
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
          {success ? (
            <SuccessCard onNew={handleReset} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">

              {/* ── Return Window Settings ─────────────────────────────── */}
              <div className={cn(
                'rounded-xl border overflow-hidden',
                billingSettings?.return_window_enabled
                  ? 'border-primary/30'
                  : 'border-border/50',
              )}>
                {/* Header row */}
                <div className={cn(
                  'flex items-center justify-between px-4 py-3',
                  billingSettings?.return_window_enabled ? 'bg-primary/5' : 'bg-muted/30',
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-base',
                      billingSettings?.return_window_enabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      ⏱
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Return Window</p>
                      <p className="text-xs text-muted-foreground">
                        {billingSettings?.return_window_enabled
                          ? `Custom: ${billingSettings.return_window_days} days`
                          : 'Default: 2 days'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      billingSettings?.return_window_enabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {billingSettings?.return_window_enabled
                        ? `Custom (${billingSettings.effective_days}d)`
                        : 'Default (2 days)'}
                    </span>
                    {isAdmin && !editingSettings && (
                      <button
                        onClick={() => setEditingSettings(true)}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Settings toast message */}
                {settingsMsg && (
                  <div className={cn(
                    'px-4 py-2 text-xs font-medium border-b',
                    settingsMsg.err
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/40'
                      : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/40',
                  )}>
                    {settingsMsg.text}
                  </div>
                )}

                {/* Edit form — admin only */}
                {editingSettings && isAdmin && (
                  <div className="px-4 py-4 border-t border-border/50 space-y-4">

                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Custom return window</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          OFF = default 2 days · ON = use custom days below
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({
                          ...prev,
                          return_window_enabled: !prev.return_window_enabled,
                        }))}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                          settingsForm.return_window_enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                        )}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                          settingsForm.return_window_enabled ? 'translate-x-6' : 'translate-x-1',
                        )} />
                      </button>
                    </div>

                    {/* Days input */}
                    {settingsForm.return_window_enabled && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">
                          Return window (days)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={settingsForm.return_window_days}
                            onChange={e => setSettingsForm(prev => ({
                              ...prev,
                              return_window_days: Math.max(1, Math.min(30, Number(e.target.value))),
                            }))}
                            className="w-24 h-10 rounded-lg border bg-background px-3 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <span className="text-sm text-muted-foreground">days from purchase date</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                          Customer has{' '}
                          <strong>
                            {settingsForm.return_window_days} day{settingsForm.return_window_days !== 1 ? 's' : ''}
                          </strong>{' '}
                          from purchase to return items.
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelSettingsEdit}
                        className="h-8 px-4 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}
                        className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {settingsSaving ? 'Saving…' : 'Save settings'}
                      </button>
                    </div>

                    {/* Last updated */}
                    {billingSettings?.updated_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Last updated:{' '}
                        {new Date(billingSettings.updated_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {billingSettings.updated_by_name && ` by ${billingSettings.updated_by_name}`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Step 1 — Bill lookup ────────────────────────────────── */}
              <div className="rounded-lg border border-border/50 bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Step 1 — Find Bill</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter bill number (e.g. BILL-20250101-ABCD)"
                    value={billSearch}
                    onChange={e => setBillSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    disabled={lookupLoading}
                  />
                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || !billSearch.trim()}
                    className={cn(
                      'flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors',
                      'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
                    )}
                  >
                    <Search size={14} />
                    {lookupLoading ? 'Searching…' : 'Find'}
                  </button>
                </div>
                {lookupError && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={14} />
                    {lookupError}
                  </div>
                )}
              </div>

              {/* ── Bill info ───────────────────────────────────────────── */}
              {bill && (
                <>
                  <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{bill.bill_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(bill.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                        {bill.customer_type}
                      </span>
                    </div>
                    {(bill.walkin_name || bill.walkin_mobile) && (
                      <p className="text-sm text-muted-foreground">
                        {bill.walkin_name}{bill.walkin_name && bill.walkin_mobile ? ' · ' : ''}{bill.walkin_mobile}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Billed by: <span className="text-foreground">{bill.billed_by_name}</span>
                    </p>

                    {/* Return window status */}
                    {(() => {
                      const effectiveDays = billingSettings?.effective_days ?? 2
                      const expiresAt     = new Date(
                        new Date(bill.created_at).getTime() + effectiveDays * 24 * 60 * 60 * 1000
                      )
                      const isWithin = new Date() <= expiresAt
                      return (
                        <div className={cn(
                          'flex items-center justify-between text-xs rounded-lg px-3 py-2 mt-1',
                          isWithin
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400',
                        )}>
                          <span>
                            {isWithin
                              ? `✅ Within return window (${effectiveDays} days)`
                              : `❌ Return period expired (${effectiveDays} days)`}
                          </span>
                          <span className="font-medium">
                            {isWithin ? 'Expires' : 'Expired'}{' '}
                            {expiresAt.toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Step 2 — select items */}
                  <div className="rounded-lg border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Step 2 — Select Items to Return</p>
                    <div className="divide-y divide-border/40">
                      {lineItems.map((li, idx) => (
                        <div key={li.item.id} className="py-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={li.selected}
                            onChange={() => toggleItem(idx)}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{li.item.product_name}</p>
                            <p className="text-xs text-muted-foreground">{li.item.variant_name} · SKU: {li.item.sku}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {li.item.quantity} · ₹{Number(li.item.line_total).toFixed(2)}
                            </p>
                          </div>
                          {li.selected && (
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-muted-foreground">Return qty:</label>
                              <input
                                type="number"
                                min={1}
                                max={li.item.quantity}
                                value={li.qty}
                                onChange={e => setItemQty(idx, parseInt(e.target.value) || 1)}
                                className="w-16 h-7 rounded border border-border/60 bg-background px-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 3 — photo */}
                  <div className="rounded-lg border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Step 3 — Upload Bill Photo (optional)</p>
                    {photoPreview ? (
                      <div className="relative inline-block">
                        <img src={photoPreview} alt="Bill" className="max-h-40 rounded border border-border/50 object-contain" />
                        <button
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      >
                        <Upload size={14} />
                        Click to upload bill photo
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhoto}
                    />
                  </div>

                  {/* Summary + submit */}
                  {selectedItems.length > 0 && (
                    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                        </span>
                        <span className="font-semibold text-foreground">
                          Est. refund: ₹{totalRefund.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {submitError && (
                        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                          {submitError}
                        </div>
                      )}

                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {submitting ? 'Submitting…' : 'Submit Return Request'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SuccessCard({ onNew }: { onNew: () => void }) {
  return (
    <div className="mx-auto max-w-sm mt-16 text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Return Request Submitted</h2>
      <p className="text-sm text-muted-foreground">
        The return request has been sent for review. You will be notified once it is processed.
      </p>
      <button
        onClick={onNew}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        New Return
      </button>
    </div>
  )
}
