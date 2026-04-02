export type TenderStatus =
  | 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled'

export type BidStatus =
  | 'bid_submitted' | 'under_negotiation'
  | 'bid_revised' | 'awarded' | 'not_awarded'

export interface MonthlyBreakdown {
  month: string
  quantity: number
}

export interface TenderItem {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  required_quantity: number
  target_price: string | null
  notes: string
  awarded_to: string | null
  awarded_to_name: string | null
  bid_count: number
}

export interface VendorBidItem {
  id: string
  tender_item: string
  supply_quantity: number
  price_per_unit: string
  dispatch_date: string
  monthly_breakdown: MonthlyBreakdown[]
  notes: string
}

export interface NegotiationLog {
  id: string
  actor_role: 'admin' | 'vendor'
  actor_name: string
  message: string
  created_at: string
}

export interface VendorBid {
  id: string
  vendor: string
  vendor_name: string
  status: BidStatus
  overall_notes: string
  negotiation_notes: string
  negotiation_logs: NegotiationLog[]
  items: VendorBidItem[]
  submitted_at: string
  updated_at: string
  update_count: number
}

export interface BidComparisonBid {
  bid_id: string
  vendor_name: string
  bid_status: BidStatus
  supply_quantity: number
  price_per_unit: string
  total_value: string
  vs_target: number | null
  dispatch_date: string
  notes: string
}

export interface BidComparison {
  tender_item: {
    id: string
    product_name: string
    required_quantity: number
    target_price: string | null
  }
  bids: BidComparisonBid[]
}

export interface Tender {
  id: string
  tender_number: string
  title: string
  description: string
  status: TenderStatus
  items: TenderItem[]
  bids: VendorBid[]
  bidding_deadline: string | null
  closed_at: string | null
  awarded_at: string | null
  cancellation_reason: string
  created_at: string
}

export interface TenderListItem {
  id: string
  tender_number: string
  title: string
  status: TenderStatus
  item_count: number
  bid_count: number
  bidding_deadline: string | null
  created_at: string
}

export interface VendorTender {
  id: string
  tender_number: string
  title: string
  description: string
  status: TenderStatus
  bidding_deadline: string | null
  items: TenderItem[]
  own_bid: VendorBid | null
}
