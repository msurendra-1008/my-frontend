// ── Settings ──────────────────────────────────────────────────────────────────

export interface ReturnSettings {
  return_window_days: number;
  predefined_reasons: string[];
}

// ── Photo ─────────────────────────────────────────────────────────────────────

export interface ReturnPhoto {
  id:         string;
  photo:      string;
  created_at: string;
}

// ── Request types ─────────────────────────────────────────────────────────────

export type ReturnRequestType   = 'return' | 'exchange';
export type ReturnRequestStatus = 'raised' | 'under_review' | 'approved' | 'rejected' | 'completed';
export type RefundMode          = 'wallet' | 'original_source';

export interface ReturnRequest {
  id:                   string;
  order_item:           {
    id:                     string;
    product_name:           string;
    variant_name:           string;
    sku:                    string;
    quantity:               number;
    upa_price:              string;
    status:                 string;
    delivered_at:           string | null;
    variant_id:             string | null;
    product_slug:           string | null;
    return_rejection_count: number;
  };
  request_type:         ReturnRequestType;
  return_qty:           number;
  exchange_variant:     string | null;
  exchange_variant_name: string | null;
  reason:               string;
  notes:                string;
  status:               ReturnRequestStatus;
  refund_amount:        string | null;
  refund_mode:          RefundMode;
  admin_notes:          string;
  user_reply_count:     number;
  raised_at:            string;
  reviewed_at:          string | null;
  completed_at:         string | null;
  raised_by:            string | null;
  raised_by_name:       string;
  photos:               ReturnPhoto[];
  updated_at:           string;
}

export interface ReturnRequestCreate {
  order_item_id:       string;
  request_type:        ReturnRequestType;
  return_qty:          number;
  exchange_variant_id?: string;
  reason:              string;
  notes?:              string;
}

export interface PaginatedReturnRequests {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ReturnRequest[];
}
