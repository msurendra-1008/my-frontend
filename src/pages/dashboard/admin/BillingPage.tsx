import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu, Search, X, Plus, Minus, Trash2, Sun, Moon, Receipt } from 'lucide-react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { cn } from '@/utils/cn'
import type { CartItem, CustomerType, PaymentMethod, OfflineBill, DiscountCode } from '@/types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function roleBadgeVariant(role: string) {
  if (role === 'superadmin') return 'danger' as const
  if (role === 'admin')      return 'warning' as const
  return 'info' as const
}

// ── Print helpers ─────────────────────────────────────────────────────────────
function generateThermalHTML(bill: OfflineBill): string {
  const items = bill.items.map(i =>
    `<tr>
      <td style="padding:2px 4px">${i.product_name}<br><small>${i.variant_name}</small></td>
      <td style="text-align:right;padding:2px 4px">${i.quantity}</td>
      <td style="text-align:right;padding:2px 4px">₹${Number(i.line_total).toFixed(2)}</td>
    </tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:monospace;font-size:12px;width:280px;margin:0 auto}
    h2{text-align:center;font-size:14px;margin:4px 0}
    .center{text-align:center}
    table{width:100%;border-collapse:collapse}
    th{border-bottom:1px solid #000;padding:2px 4px;text-align:left}
    .total{font-weight:bold;border-top:1px solid #000}
    hr{border-top:1px dashed #000}
    @media print{body{margin:0}}
  </style></head><body>
  <h2>BILL RECEIPT</h2>
  <p class="center">${bill.bill_number}</p>
  <p class="center">${new Date(bill.created_at).toLocaleString('en-IN')}</p>
  <hr>
  ${bill.walkin_name ? `<p>Customer: ${bill.walkin_name}</p>` : ''}
  ${bill.walkin_mobile ? `<p>Mobile: ${bill.walkin_mobile}</p>` : ''}
  <hr>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <hr>
  ${Number(bill.discount_amount) > 0 ? `<p>Discount: -₹${Number(bill.discount_amount).toFixed(2)}</p>` : ''}
  <p class="total">TOTAL: ₹${Number(bill.amount_payable).toFixed(2)}</p>
  <p>Payment: ${bill.payment_method.toUpperCase()}</p>
  ${bill.cash_received ? `<p>Cash: ₹${Number(bill.cash_received).toFixed(2)}</p>` : ''}
  ${bill.change_given ? `<p>Change: ₹${Number(bill.change_given).toFixed(2)}</p>` : ''}
  <hr>
  <p class="center">Thank you for shopping!</p>
  </body></html>`
}

function generateA4HTML(bill: OfflineBill): string {
  const rows = bill.items.map((i, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td>${i.product_name} — ${i.variant_name}<br><small style="color:#666">${i.sku}</small></td>
      <td style="text-align:right">₹${Number(i.mrp).toFixed(2)}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${i.gst_amount ? (Number(i.gst_amount) / i.quantity * 100 / Number(i.mrp)).toFixed(0) + '%' : '0%'}</td>
      <td style="text-align:right">₹${i.gst_amount ? Number(i.gst_amount).toFixed(2) : '0.00'}</td>
      <td style="text-align:right">₹${Number(i.line_total).toFixed(2)}</td>
    </tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;margin:30px;color:#000}
    h1{font-size:22px;margin:0}
    .header{display:flex;justify-content:space-between;margin-bottom:20px}
    .bill-info{background:#f5f5f5;padding:12px;border-radius:4px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#333;color:#fff;padding:8px;text-align:left;font-size:12px}
    td{padding:7px 8px;border-bottom:1px solid #ddd;font-size:12px}
    .total-row{font-weight:bold;font-size:14px}
    .footer{text-align:center;color:#666;font-size:11px;margin-top:20px}
    @media print{body{margin:10px}}
  </style></head><body>
  <div class="header">
    <div><h1>GST TAX INVOICE</h1><p style="margin:0;color:#666">Bill No: <strong>${bill.bill_number}</strong></p></div>
    <div style="text-align:right"><p style="margin:0">Date: ${new Date(bill.created_at).toLocaleDateString('en-IN')}</p><p style="margin:0">Order: ${bill.order_number}</p></div>
  </div>
  <div class="bill-info">
    <p style="margin:0"><strong>Billed by:</strong> ${bill.billed_by_name}</p>
    ${bill.walkin_name ? `<p style="margin:4px 0 0"><strong>Customer:</strong> ${bill.walkin_name} ${bill.walkin_mobile ? '| ' + bill.walkin_mobile : ''}</p>` : ''}
    <p style="margin:4px 0 0"><strong>Payment:</strong> ${bill.payment_method.toUpperCase()}</p>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>Rate</th><th>Qty</th><th>GST%</th><th>GST Amt</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="text-align:right">
    ${Number(bill.discount_amount) > 0 ? `<p>Discount: -₹${Number(bill.discount_amount).toFixed(2)}</p>` : ''}
    <p class="total-row" style="font-size:16px">GRAND TOTAL: ₹${Number(bill.amount_payable).toFixed(2)}</p>
    ${bill.cash_received ? `<p>Cash received: ₹${Number(bill.cash_received).toFixed(2)} | Change: ₹${Number(bill.change_given || 0).toFixed(2)}</p>` : ''}
  </div>
  <div class="footer"><p>This is a computer-generated invoice. Thank you for your business!</p></div>
  </body></html>`
}

// ── Main Component ────────────────────────────────────────────────────────────
export function BillingPage() {
  const { theme, toggleTheme } = useTheme()
  const { user }               = useAuthStore()
  const [sidebar, setSidebar]  = useState(false)

  // Customer state
  const [customerType, setCustomerType]       = useState<CustomerType>('walkin')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerSearch, setCustomerSearch]   = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [walkinName, setWalkinName]           = useState('')
  const [walkinMobile, setWalkinMobile]       = useState('')
  const customerSearchTimeout                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Product state
  const [productSearch, setProductSearch]     = useState('')
  const [products, setProducts]               = useState<any[]>([])
  const [productLoading, setProductLoading]   = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<any>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const productSearchTimeout                  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Cart state
  const [cart, setCart]                       = useState<CartItem[]>([])

  // Discount state
  const [discountInput, setDiscountInput]     = useState('')
  const [appliedCode, setAppliedCode]         = useState<DiscountCode | null>(null)
  const [discountAmount, setDiscountAmount]   = useState(0)
  const [discountError, setDiscountError]     = useState('')
  const [validatingCode, setValidatingCode]   = useState(false)

  // Payment state
  const [paymentMethod, setPaymentMethod]     = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived]       = useState('')

  // Bill state
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState('')
  const [completedBill, setCompletedBill]     = useState<OfflineBill | null>(null)
  const [showPrintModal, setShowPrintModal]   = useState(false)

  // ── Customer search ──────────────────────────────────────────────────────
  const searchCustomers = useCallback((q: string) => {
    if (!q.trim()) { setCustomerResults([]); return }
    clearTimeout(customerSearchTimeout.current)
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await billingService.searchCustomers(q)
        setCustomerResults(res.data.results ?? [])
      } catch { setCustomerResults([]) }
    }, 300)
  }, [])

  useEffect(() => { searchCustomers(customerSearch) }, [customerSearch, searchCustomers])

  // ── Product search ────────────────────────────────────────────────────────
  const searchProducts = useCallback((q: string) => {
    clearTimeout(productSearchTimeout.current)
    setProductLoading(true)
    productSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await billingService.searchProducts(q)
        setProducts(res.data.results ?? [])
      } catch { setProducts([]) }
      finally { setProductLoading(false) }
    }, 300)
  }, [])

  useEffect(() => { searchProducts(productSearch) }, [productSearch, searchProducts])

  // Initial load
  useEffect(() => { searchProducts('') }, [])

  // ── Load product variants ─────────────────────────────────────────────────
  const loadVariants = async (product: any) => {
    if (expandedProduct?.id === product.id) {
      setExpandedProduct(null)
      return
    }
    setLoadingVariants(true)
    try {
      setExpandedProduct({ ...product, variants: [] })
      // Fetch detail by slug
      const axiosInstance = (await import('@/utils/axiosInstance')).default
      const detail = await axiosInstance.get(`/api/v1/products/${product.slug}/`)
      setExpandedProduct(detail.data)
    } catch {
      setExpandedProduct(product)
    } finally {
      setLoadingVariants(false)
    }
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const getPrice = (variant: any, _product: any) => {
    if (customerType === 'upa' && selectedCustomer && variant.upa_price) {
      return Number(variant.upa_price)
    }
    return Number(variant.mrp)
  }

  const addToCart = (variant: any, product: any) => {
    const unitPrice = getPrice(variant, product)
    setCart(prev => {
      const existing = prev.find(i => i.variant_id === variant.id)
      if (existing) {
        return prev.map(i =>
          i.variant_id === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        variant_id:         variant.id,
        variant_name:       variant.name,
        product_name:       product.name,
        product_id:         product.id,
        sku:                variant.sku,
        unit_price:         unitPrice,
        mrp:                Number(variant.mrp),
        upa_price:          variant.upa_price ? Number(variant.upa_price) : null,
        quantity:           1,
        gst_rate:           Number(product.gst_percentage || 0),
        other_charges:      Number(product.other_charges || 0),
        other_charges_type: product.other_charges_type || 'flat',
        stock:              variant.stock_quantity,
        image:              null,
      }]
    })
  }

  const updateQty = (variantId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.variant_id === variantId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variant_id !== variantId))
  }

  // Recalculate prices when customer type changes
  useEffect(() => {
    setCart(prev => prev.map(i => ({
      ...i,
      unit_price: customerType === 'upa' && selectedCustomer && i.upa_price
        ? i.upa_price
        : i.mrp,
    })))
  }, [customerType, selectedCustomer])

  // ── Bill calculations ─────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  const otherChargesTotal = cart.reduce((s, i) => {
    const charge = i.other_charges_type === 'flat'
      ? i.other_charges * i.quantity
      : i.unit_price * i.other_charges / 100 * i.quantity
    return s + charge
  }, 0)

  const gstTotal = cart.reduce(
    (s, i) => s + i.unit_price * i.gst_rate / 100 * i.quantity, 0
  )

  const grossTotal  = subtotal + otherChargesTotal + gstTotal
  const totalPayable = Math.max(grossTotal - discountAmount, 0)
  const cashChange   = paymentMethod === 'cash' && cashReceived
    ? Number(cashReceived) - totalPayable : 0

  // ── Discount code ─────────────────────────────────────────────────────────
  const applyDiscount = async () => {
    if (!discountInput.trim()) return
    setValidatingCode(true)
    setDiscountError('')
    try {
      const res = await billingService.validateCode(discountInput.trim(), grossTotal)
      setAppliedCode(res.data.code)
      setDiscountAmount(Number(res.data.discount_amount))
    } catch (err: any) {
      setDiscountError(err?.response?.data?.error || 'Invalid code')
      setAppliedCode(null)
      setDiscountAmount(0)
    } finally {
      setValidatingCode(false)
    }
  }

  const removeDiscount = () => {
    setAppliedCode(null)
    setDiscountAmount(0)
    setDiscountInput('')
    setDiscountError('')
  }

  // ── Complete bill ─────────────────────────────────────────────────────────
  const handleCompleteBill = async () => {
    if (cart.length === 0) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await billingService.createBill({
        customer_type:     customerType,
        customer_user_id:  selectedCustomer?.id,
        walkin_name:       walkinName,
        walkin_mobile:     walkinMobile,
        items:             cart.map(i => ({ variant_id: i.variant_id, quantity: i.quantity })),
        payment_method:    paymentMethod,
        cash_received:     cashReceived ? Number(cashReceived) : undefined,
        discount_code:     appliedCode?.code,
      })
      setCompletedBill(res.data)
      setShowPrintModal(true)
      // Reset
      setCart([])
      setSelectedCustomer(null)
      setCustomerType('walkin')
      setWalkinName('')
      setWalkinMobile('')
      setCustomerSearch('')
      setAppliedCode(null)
      setDiscountAmount(0)
      setDiscountInput('')
      setCashReceived('')
      setPaymentMethod('cash')
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Bill creation failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  const printThermal = (bill: OfflineBill) => {
    const w = window.open('', '_blank', 'width=320,height=600')
    w?.document.write(generateThermalHTML(bill))
    w?.document.close()
    w?.print()
  }

  const printA4 = (bill: OfflineBill) => {
    const w = window.open('', '_blank')
    w?.document.write(generateA4HTML(bill))
    w?.document.close()
    w?.print()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebar} onMobileToggle={() => setSidebar(v => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[52px] items-center justify-between border-b bg-card px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebar(v => !v)}>
              <Menu size={20} />
            </button>
            <Receipt size={16} className="text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">New Bill</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Badge variant={roleBadgeVariant(user?.role ?? '')} className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </header>

        {/* POS Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Product search */}
          <div className="flex flex-col border-r border-border/50 w-[55%] overflow-hidden">

            {/* Customer selector */}
            <div className="border-b border-border/50 p-3 flex-shrink-0 space-y-2">
              {/* Type buttons */}
              <div className="flex gap-2">
                {(['walkin', 'upa', 'regular'] as CustomerType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setCustomerType(t); setSelectedCustomer(null); setCustomerSearch('') }}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium transition-colors border',
                      customerType === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {t === 'walkin' ? 'Walk-in' : t === 'upa' ? 'UPA Member' : 'Regular User'}
                  </button>
                ))}
              </div>

              {/* Walk-in fields */}
              {customerType === 'walkin' && (
                <div className="flex gap-2">
                  <input
                    placeholder="Customer name (optional)"
                    value={walkinName}
                    onChange={e => setWalkinName(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    placeholder="Mobile (optional)"
                    value={walkinMobile}
                    onChange={e => setWalkinMobile(e.target.value)}
                    className="w-36 h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* UPA/Regular customer search */}
              {customerType !== 'walkin' && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search by UPA ID / mobile / name..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full h-8 rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {customerResults.length > 0 && !selectedCustomer && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {customerResults.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]) }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-xs"
                        >
                          <p className="font-medium">{c.full_name || c.name}</p>
                          <p className="text-muted-foreground">{c.upa_id} · {c.mobile}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected customer card */}
              {selectedCustomer && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedCustomer.full_name || selectedCustomer.name}</p>
                    <p className="text-[10px] text-primary">{selectedCustomer.upa_id} · {customerType === 'upa' ? 'UPA pricing applies' : 'Regular'}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Product search */}
            <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto">
              {productLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No products found</p>
              ) : (
                <div className="divide-y divide-border/30">
                  {products.map((product: any) => (
                    <div key={product.id}>
                      <button
                        onClick={() => loadVariants(product)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-md bg-muted/50 flex-shrink-0 overflow-hidden">
                          {product.primary_image
                            ? <img src={product.primary_image} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">📦</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">{product.sku} · Stock: {product.total_stock}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-primary">₹{Number(product.mrp).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">{product.variant_count} variant{product.variant_count !== 1 ? 's' : ''}</p>
                        </div>
                      </button>

                      {/* Expanded variants */}
                      {expandedProduct?.id === product.id && (
                        <div className="bg-muted/20 px-3 pb-2">
                          {loadingVariants ? (
                            <p className="text-xs text-muted-foreground py-2">Loading variants...</p>
                          ) : (expandedProduct.variants || []).map((v: any) => {
                            const price = getPrice(v, expandedProduct)
                            return (
                              <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                                <div>
                                  <p className="text-xs font-medium">{v.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{v.sku} · Stock: {v.stock_quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-primary">₹{price.toFixed(2)}</span>
                                  {v.stock_quantity <= 0 ? (
                                    <span className="text-[10px] text-red-500">Out of stock</span>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(v, expandedProduct)}
                                      className="h-6 px-2 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90"
                                    >
                                      Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Cart */}
          <div className="flex flex-col w-[45%] bg-card overflow-hidden">

            {/* Cart header */}
            <div className="px-4 py-3 border-b border-border/50 flex-shrink-0 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</p>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600">Clear</button>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Receipt size={40} className="mb-2 opacity-30" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1">Add products from the left</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {cart.map(item => (
                    <div key={item.variant_id} className="px-4 py-2.5 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.variant_name} · {item.sku}</p>
                        <p className="text-[10px] text-primary">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => updateQty(item.variant_id, -1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted/50 transition-colors">
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.variant_id, 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40"
                        >
                          <Plus size={10} />
                        </button>
                        <span className="w-16 text-right text-xs font-semibold text-foreground">
                          ₹{(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                        <button onClick={() => removeFromCart(item.variant_id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill details (fixed bottom) */}
            <div className="flex-shrink-0 border-t border-border/50 space-y-3 p-4">

              {/* Discount code */}
              {!appliedCode ? (
                <div className="flex gap-2">
                  <input
                    placeholder="Discount code"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                    className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={applyDiscount}
                    disabled={validatingCode || !discountInput.trim()}
                    className="h-8 px-3 rounded-md bg-muted text-xs font-medium hover:bg-muted/70 disabled:opacity-50"
                  >
                    {validatingCode ? '...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-400/40 rounded-md px-3 py-1.5">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {appliedCode.code} — {appliedCode.type === 'percent' ? `${appliedCode.value}%` : fmt(Number(appliedCode.value))} off
                  </span>
                  <button onClick={removeDiscount} className="text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
              )}
              {discountError && (
                <p className="text-[10px] text-red-500">{discountError}</p>
              )}

              {/* Payment method */}
              <div className="flex gap-2">
                {(['cash', 'upi', 'card'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      'flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors',
                      paymentMethod === m
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Cash received */}
              {paymentMethod === 'cash' && (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Cash received"
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {cashChange > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold whitespace-nowrap">
                      Change: {fmt(cashChange)}
                    </span>
                  )}
                </div>
              )}

              {/* Bill summary */}
              <div className="space-y-1 text-xs border-t border-border/30 pt-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {otherChargesTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Other charges</span>
                    <span>{fmt(otherChargesTotal)}</span>
                  </div>
                )}
                {gstTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST</span>
                    <span>{fmt(gstTotal)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t border-border/50 pt-1 mt-1">
                  <span>Total</span>
                  <span className="text-primary">{fmt(totalPayable)}</span>
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-red-500 rounded-md bg-red-500/10 border border-red-400/40 px-2 py-1">{saveError}</p>
              )}

              {/* Complete button */}
              <button
                onClick={handleCompleteBill}
                disabled={cart.length === 0 || saving}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating bill...' : 'Complete Bill'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print modal */}
      {showPrintModal && completedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-xl border border-border p-6 max-w-sm w-full mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Receipt size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-bold text-lg text-foreground">Bill Created!</h2>
              <p className="text-sm text-muted-foreground mt-1">{completedBill.bill_number}</p>
              <p className="text-base font-semibold text-primary mt-1">{fmt(Number(completedBill.amount_payable))}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => printThermal(completedBill)}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                🖨 Print Thermal Receipt
              </button>
              <button
                onClick={() => printA4(completedBill)}
                className="w-full h-10 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
              >
                📄 Print A4 GST Invoice
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip printing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
