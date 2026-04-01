import { useState, useEffect } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { tenderService } from '@/services/tenderService'
import axiosInstance from '@/utils/axiosInstance'

interface Product {
  id: string
  name: string
  sku: string
}

interface ProductRow {
  product_id: string
  required_quantity: string
  target_price: string
  notes: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const emptyRow = (): ProductRow => ({
  product_id: '',
  required_quantity: '',
  target_price: '',
  notes: '',
})

export function CreateTenderSheet({ open, onClose, onSuccess }: Props) {
  const [products, setProducts]     = useState<Product[]>([])
  const [loadingP, setLoadingP]     = useState(true)
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [deadline, setDeadline]     = useState('')
  const [rows, setRows]             = useState<ProductRow[]>([emptyRow()])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingP(true)
    axiosInstance
      .get<{ results: Product[] }>('/api/v1/products/', {
        params: { page_size: 200, is_published: true },
      })
      .then(r => {
        const data = r.data as unknown as { results?: Product[] } | Product[]
        setProducts(Array.isArray(data) ? data : (data as { results?: Product[] }).results ?? [])
      })
      .finally(() => setLoadingP(false))
  }, [open])

  const reset = () => {
    setTitle('')
    setDesc('')
    setDeadline('')
    setRows([emptyRow()])
    setError('')
    setSuccess('')
  }

  const handleClose = () => { reset(); onClose() }

  const updateRow = (i: number, field: keyof ProductRow, val: string) =>
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))

  const addRow = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = (i: number) => setRows(prev => prev.filter((_, j) => j !== i))

  const handleSave = async (openImmediately: boolean) => {
    setError('')
    setSuccess('')
    if (!title.trim()) { setError('Title is required.'); return }
    for (const r of rows) {
      if (!r.product_id) { setError('Select a product for every row.'); return }
      if (!r.required_quantity || Number(r.required_quantity) < 1) {
        setError('Required quantity must be at least 1 for every row.')
        return
      }
    }
    const productIds = rows.map(r => r.product_id)
    if (new Set(productIds).size !== productIds.length) {
      setError('Duplicate products detected. Each product can appear only once.')
      return
    }

    setSaving(true)
    try {
      await tenderService.createTender({
        title: title.trim(),
        description: description.trim(),
        bidding_deadline: deadline || null,
        open_immediately: openImmediately,
        items: rows.map(r => ({
          product_id: r.product_id,
          required_quantity: Number(r.required_quantity),
          target_price: r.target_price ? r.target_price : null,
          notes: r.notes,
        })),
      })
      setSuccess(`Tender ${openImmediately ? 'created & opened' : 'saved as draft'} successfully.`)
      setTimeout(() => { reset(); onSuccess() }, 800)
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } }
      const d = e?.response?.data
      if (d && typeof d === 'object') {
        setError(Object.values(d).flat().join(' ') || 'Something went wrong.')
      } else {
        setError('Something went wrong.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative flex w-full max-w-[560px] flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Create Tender</h2>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Office Supplies Q2 2025" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="Optional details about this tender…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-1 block text-sm font-medium">Bidding Deadline (optional)</label>
            <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          {/* Product rows */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Products *</label>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add product
              </button>
            </div>

            {loadingP ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Product {i + 1}</span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-destructive hover:text-destructive/70"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Product select */}
                    <div>
                      <label className="mb-1 block text-xs font-medium">Product *</label>
                      <select
                        value={row.product_id}
                        onChange={e => updateRow(i, 'product_id', e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">— Select a product —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty + price row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Required Qty *</label>
                        <Input
                          type="number"
                          min={1}
                          value={row.required_quantity}
                          onChange={e => updateRow(i, 'required_quantity', e.target.value)}
                          placeholder="e.g. 500"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Target Price (₹) — optional</label>
                        <Input
                          type="number"
                          value={row.target_price}
                          onChange={e => updateRow(i, 'target_price', e.target.value)}
                          placeholder="Guide price"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-1 block text-xs font-medium">Notes (optional)</label>
                      <Input
                        value={row.notes}
                        onChange={e => updateRow(i, 'notes', e.target.value)}
                        placeholder="Quality specs, packaging, etc."
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t px-6 py-4">
          <Button onClick={() => handleSave(true)} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save &amp; Open bidding
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="w-full">
            Save as draft
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={saving} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
