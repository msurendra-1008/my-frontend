export type CustomerType  = 'walkin' | 'upa' | 'regular'
export type PaymentMethod = 'cash' | 'upi' | 'card'
export type ReturnStatus  = 'pending' | 'approved' | 'rejected'

export interface BillItem {
  variant_id: string
  quantity:   number
}

export interface CartItem {
  variant_id:    string
  variant_name:  string
  product_name:  string
  product_id:    string
  sku:           string
  unit_price:    number
  mrp:           number
  upa_price:     number | null
  quantity:      number
  gst_rate:      number
  other_charges: number
  other_charges_type: 'flat' | 'percent'
  stock:         number
  image:         string | null
}

export interface DiscountCode {
  id:           string
  code:         string
  type:         'percent' | 'flat'
  value:        string
  max_uses:     number
  used_count:   number
  valid_till:   string | null
  is_active:    boolean
  is_valid_now: boolean
}

export interface OfflineBill {
  id:              string
  bill_number:     string
  order_number:    string
  customer_type:   CustomerType
  walkin_name:     string
  walkin_mobile:   string
  payment_method:  PaymentMethod
  cash_received:   string | null
  change_given:    string | null
  discount_amount: string
  amount_payable:  string
  items:           OfflineBillItem[]
  billed_by_name:  string
  created_at:      string
}

export interface OfflineBillItem {
  id:           string
  product_name: string
  variant_name: string
  sku:          string
  mrp:          string
  upa_price:    string
  quantity:     number
  line_total:   string
  gst_amount:   string | null
  other_charges: string | null
  status:       string
}

export interface CreateBillPayload {
  customer_type:     CustomerType
  customer_user_id?: string
  walkin_name?:      string
  walkin_mobile?:    string
  items:             BillItem[]
  payment_method:    PaymentMethod
  cash_received?:    number
  discount_code?:    string
}

export interface ValidateCodeResponse {
  valid:           boolean
  discount_amount: number
  code:            DiscountCode
}

export interface OfflineReturn {
  id:           string
  bill_number:  string
  status:       ReturnStatus
  items:        Array<{ order_item_id: string; qty: number }>
  total_refund: string
  bill_photo:   string | null
  review_notes: string
  created_at:   string
}
