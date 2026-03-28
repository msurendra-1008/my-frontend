export type ShipmentStatus = 'awaiting_inspection' | 'completed' | 'cancelled'

export type RejectionReason =
  | 'damaged_packaging'
  | 'product_defective'
  | 'wrong_product'
  | 'quantity_mismatch'
  | 'expired'
  | 'other'

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  damaged_packaging: 'Damaged packaging',
  product_defective: 'Product defective',
  wrong_product:     'Wrong product received',
  quantity_mismatch: 'Quantity mismatch',
  expired:           'Expired / near expiry',
  other:             'Other',
}

export const REJECTION_REASON_KEYS = Object.keys(REJECTION_REASON_LABELS) as RejectionReason[]

export interface RejectionBreakdown {
  [reason: string]: number
}

export interface InspectionReport {
  id: string
  received_quantity: number
  accepted_quantity: number
  rejected_quantity: number
  missing_quantity: number
  rejection_breakdown: RejectionBreakdown
  rejection_breakdown_labeled: Record<string, number>
  rejection_other_notes: string
  general_notes: string
  inspected_by_name: string
  inspected_at: string
  stock_updated: boolean
  stock_updated_at: string | null
  stock_updated_by_name: string | null
  debit_note_url: string | null
  debit_note_generated_at: string | null
}

export interface IncomingShipment {
  id: string
  po_number: string
  vendor_company: string
  product_name: string
  product_image_url: string | null
  expected_quantity: number
  status: ShipmentStatus
  report: InspectionReport | null
  created_at: string
  price_per_unit: string
  total_amount: string
  // list serializer extras
  has_report?: boolean
  stock_updated?: boolean
}

export interface InspectionSettings {
  auto_stock_update: boolean
}

export interface InspectionReportWriteData {
  received_quantity: number
  accepted_quantity: number
  rejected_quantity: number
  rejection_breakdown?: RejectionBreakdown
  rejection_other_notes?: string
  general_notes?: string
}
