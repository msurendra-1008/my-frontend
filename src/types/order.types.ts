// ── Address ───────────────────────────────────────────────────────────────────

export interface Address {
  id:           string;
  name:         string;
  phone:        string;
  address_line: string;
  city:         string;
  state:        string;
  pincode:      string;
  is_default:   boolean;
  created_at:   string;
}

export interface AddressFormData {
  name:         string;
  phone:        string;
  address_line: string;
  city:         string;
  state:        string;
  pincode:      string;
  is_default:   boolean;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  id:            string;
  variant_id:    string;
  variant_name:  string;
  variant_type:  string;
  product_name:  string;
  product_slug:  string;
  sku:           string;
  stock:         number;
  mrp:           string;
  upa_price:     string;
  primary_image: string | null;
  quantity:      number;
}

export interface CartTotals {
  subtotal:       string;
  upa_discount:   string;
  amount_payable: string;
  item_count:     number;
}

export interface Cart {
  id:     string;
  items:  CartItem[];
  totals: CartTotals;
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export interface CheckoutInitiateRequest {
  address_id:    string;
  wallet_amount: string | number;
}

export interface CheckoutInitiateResponse {
  internal_order_id:  string;
  address:            Address;
  subtotal:           string;
  upa_discount:       string;
  amount_payable:     string;
  wallet_used:        string;
  razorpay_amount:    string;
  razorpay_order_id:  string;
  razorpay_key_id:    string;
}

export interface CheckoutConfirmRequest {
  internal_order_id:   string;
  address_id:          string;
  wallet_amount:       string | number;
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

// ── Order ─────────────────────────────────────────────────────────────────────

export type OrderStatus    = 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus  = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderItemStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'exchange_requested'
  | 'exchange_approved'
  | 'exchange_rejected'
  | 'refunded'
  | 'exchanged';

export interface OrderItem {
  id:           string;
  product_name: string;
  variant_name: string;
  sku:          string;
  mrp:          string;
  upa_price:    string;
  quantity:     number;
  line_total:   string;
  status:       OrderItemStatus;
}

export interface OrderListItem {
  id:              string;
  order_number:    string;
  order_status:    OrderStatus;
  payment_status:  PaymentStatus;
  amount_payable:  string;
  wallet_used:     string;
  razorpay_amount: string;
  item_count:      number;
  first_item_name: string;
  customer_name:   string;
  customer_mobile: string;
  created_at:      string;
}

export interface Order {
  id:                  string;
  order_number:        string;
  order_status:        OrderStatus;
  payment_status:      PaymentStatus;
  subtotal:            string;
  upa_discount:        string;
  amount_payable:      string;
  wallet_used:         string;
  razorpay_amount:     string;
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  address_name:        string;
  address_phone:       string;
  address_line:        string;
  address_city:        string;
  address_state:       string;
  address_pincode:     string;
  tracking_number:     string;
  customer_name:       string;
  customer_mobile:     string;
  items:               OrderItem[];
  created_at:          string;
  updated_at:          string;
}

export interface PaginatedOrders {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  OrderListItem[];
}
