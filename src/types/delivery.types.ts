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
  is_on_duty:         boolean;
  duty_started_at:    string | null;
  active_assignments: number;
  created_at:         string;
}

export type DutyStatus = 'on_duty' | 'off_duty';

export interface DutySession {
  start_display: string;
  end_display:   string;       // 'Ongoing' when session is still open
  hours:         number;
  ongoing:       boolean;
  auto_closed:   boolean;      // true when partner forgot to toggle off (capped at midnight)
}

export interface DailyLedgerEntry {
  date:              string;
  day_name:          string;
  status:            'full_day' | 'half_day' | 'absent' | 'future';
  total_hours:       number | null;
  first_in_display:  string | null;
  last_out_display:  string | null;
  session_count:     number;
  sessions:          DutySession[];
  orders_delivered?: number;
  orders_failed?:    number;
}

export interface DutyThresholds {
  full_day_hours:  number;
  half_day_hours:  number;
  count_half_days: boolean;
}

export interface MonthlyLedger {
  partner_name:      string;
  employee_code:     string;
  year:              number;
  month:             number;
  month_name:        string;
  days_in_month:     number;
  days_worked:       number;
  full_days:         number;
  half_days:         number;
  absent_days:       number;
  total_hours:       number;
  avg_hours_per_day: number;
  total_delivered:   number;
  total_failed:      number;
  days:              DailyLedgerEntry[];
  timezone:          string;
  duty_thresholds:   DutyThresholds;
}

export interface DeliverySettings {
  auto_assign:            boolean;
  assignment_mode:        'manual' | 'suggested' | 'automatic';
  default_proof_type:     'photo' | 'otp' | 'either';
  max_orders_per_partner: number;
  full_day_hours:         number;
  half_day_hours:         number;
  count_half_days:        boolean;
  updated_at:             string;
}

export interface DeliveryStatusLog {
  id:              string;
  status:          DeliveryStatus;
  notes:           string;
  created_at:      string;
  created_by_name: string | null;
}

export type DeliveryStatus = 'assigned' | 'picked_up' | 'delivered' | 'failed' | 'cancelled';
export type AssignmentType = 'order' | 'exchange';

export interface ExchangeItem {
  product_name: string;
  variant_name: string;
  quantity:     number;
}

export interface DeliveryAssignment {
  id:              string;
  assignment_type: AssignmentType;
  order:           string | null;
  order_number:    string | null;
  exchange_item:   ExchangeItem | null;
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
  assignment_type: AssignmentType;
  order_number:    string | null;
  exchange_item:   ExchangeItem | null;
  customer_name:   string;
  customer_phone:  string;
  delivery_address: string;
  status:          DeliveryStatus;
  assigned_at:     string;
  picked_up_at:    string | null;
  delivered_at:    string | null;
  proof_image:     string | null;
  failure_reason:  string;
  notes:           string;
  logs:            DeliveryStatusLog[];
}

export interface UnassignedOrder {
  order_id:          string;
  order_number:      string;
  customer_name:     string;
  address_city:      string;
  address_pincode:   string;
  total_amount:      string;
  item_count:        number;
  suggested_partner: DeliveryPartner | null;
}

export interface Paginated<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}
