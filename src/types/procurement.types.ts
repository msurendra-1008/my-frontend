export type RequirementStatus =
  | 'draft'
  | 'sent'
  | 'vendor_responded'
  | 'negotiating'
  | 'po_generated'
  | 'cancelled';

export type POStatus =
  | 'generated'
  | 'acknowledged'
  | 'dispatched'
  | 'inspection_pending'
  | 'completed'
  | 'cancelled';

export interface MonthlyBreakdown {
  month: string;      // "YYYY-MM"
  quantity: number;
}

export interface VendorResponseData {
  id: string;
  supply_quantity: number;
  price_per_unit: string;
  dispatch_date: string;
  monthly_breakdown: MonthlyBreakdown[];
  notes: string;
  submitted_at: string;
  updated_at: string;
  update_count: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  product_name: string;
  product_image: string | null;
  vendor_company: string;
  quantity: number;
  price_per_unit: string;
  total_amount: string;
  monthly_breakdown: MonthlyBreakdown[];
  dispatch_date: string;
  status: POStatus;
  vendor_notes: string;
  admin_notes: string;
  generated_at: string;
  acknowledged_at: string | null;
  dispatched_at: string | null;
}

export interface ProcurementRequirement {
  id: string;
  product_name: string;
  product_image: string | null;
  vendor_company: string;
  required_quantity: number;
  required_by_date: string;
  target_price: string | null;
  notes: string;
  status: RequirementStatus;
  negotiation_notes: string;
  cancellation_reason: string;
  vendor_response: VendorResponseData | null;
  po: PurchaseOrder | null;
  created_by_name: string | null;
  created_at: string;
  sent_at: string | null;
  confirmed_at: string | null;
}

export interface ProcurementListItem {
  id: string;
  product_name: string;
  product_image: string | null;
  vendor_company: string;
  required_quantity: number;
  required_by_date: string;
  target_price: string | null;
  status: RequirementStatus;
  created_at: string;
}

export interface ProcurementStats {
  total: number;
  sent: number;
  awaiting_confirmation: number;
  po_generated: number;
}

export interface PaginatedRequirements {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProcurementListItem[];
  stats: ProcurementStats;
}

export interface PaginatedPOs {
  count: number;
  next: string | null;
  previous: string | null;
  results: PurchaseOrder[];
}

export interface VendorResponseWriteData {
  supply_quantity: number;
  price_per_unit: string;
  dispatch_date: string;
  monthly_breakdown: MonthlyBreakdown[];
  notes?: string;
}
