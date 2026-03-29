export interface Warehouse {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  zone_count: number;
  created_at: string;
}

export interface Zone {
  id: string;
  warehouse: string;
  warehouse_name: string;
  name: string;
  is_active: boolean;
  rack_count: number;
  created_at: string;
}

export interface Rack {
  id: string;
  zone: string;
  zone_name: string;
  warehouse_id: string;
  warehouse_name: string;
  code: string;
  capacity: number;
  is_active: boolean;
  current_stock: number;
  capacity_percentage: number | null;
  created_at: string;
}

export interface ProductVariantLite {
  id: string;
  name: string;
  sku: string;
  product_name: string;
  stock_quantity: number;
}

export interface RackStock {
  id: string;
  rack: string;
  rack_code: string;
  zone_name: string;
  warehouse_id: string;
  warehouse_name: string;
  variant: string;
  variant_name: string;
  product_name: string;
  product_image: string | null;
  sku: string;
  quantity: number;
  last_updated: string;
}

export type MovementType = 'inbound' | 'outbound' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'return_in';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  inbound:      'Inbound',
  outbound:     'Outbound',
  transfer_in:  'Transfer In',
  transfer_out: 'Transfer Out',
  adjustment:   'Adjustment',
  return_in:    'Return In',
};

export interface StockMovement {
  id: string;
  rack: string;
  rack_code: string;
  zone_name: string;
  warehouse_name: string;
  variant: string;
  variant_name: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number;
  reference: string;
  notes: string;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  from_rack: string;
  from_rack_code: string;
  from_warehouse: string;
  to_rack: string;
  to_rack_code: string;
  to_warehouse: string;
  variant: string;
  variant_name: string;
  product_name: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  initiated_by: string | null;
  initiated_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}
