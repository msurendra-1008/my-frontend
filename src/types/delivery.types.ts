export interface DeliveryZone {
  id:         string;
  name:       string;
  pincodes:   string;
  is_active:  boolean;
  created_at: string;
}

export interface DeliveryPartner {
  id:                 string;
  user:               string;
  full_name:          string;
  email:              string | null;
  mobile:             string | null;
  vehicle_type:       'bike' | 'scooter' | 'car' | 'van' | 'other';
  vehicle_number:     string;
  zones:              DeliveryZone[];
  is_active:          boolean;
  active_assignments: number;
  created_at:         string;
}

export interface DeliverySettings {
  auto_assign:     boolean;
  assignment_mode: 'zone_match' | 'manual';
  updated_at:      string;
}

export interface DeliveryStatusLog {
  id:              string;
  status:          DeliveryStatus;
  notes:           string;
  created_at:      string;
  created_by_name: string | null;
}

export type DeliveryStatus = 'assigned' | 'picked_up' | 'delivered' | 'failed' | 'cancelled';

export interface DeliveryAssignment {
  id:              string;
  order:           string;
  order_number:    string;
  customer_name:   string;
  delivery_address: string;
  partner:         string | null;
  partner_name:    string | null;
  partner_mobile:  string | null;
  partner_vehicle: string | null;
  otp:             string;
  status:          DeliveryStatus;
  assigned_at:     string;
  picked_up_at:    string | null;
  delivered_at:    string | null;
  proof_image:     string | null;
  failure_reason:  string;
  notes:           string;
  logs:            DeliveryStatusLog[];
}

export interface PartnerAssignment {
  id:              string;
  order_number:    string;
  customer_name:   string;
  customer_phone:  string;
  delivery_address: string;
  otp:             string;
  status:          DeliveryStatus;
  assigned_at:     string;
  picked_up_at:    string | null;
  delivered_at:    string | null;
  proof_image:     string | null;
  failure_reason:  string;
  notes:           string;
  logs:            DeliveryStatusLog[];
}

export interface Paginated<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}
