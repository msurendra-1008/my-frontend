export interface CommissionSettings {
  id:                     string;
  direction:              'top_heavy' | 'bottom_heavy';
  max_upline_levels:      number;
  use_max_levels:         boolean;
  level_percentages:      number[];
  network_commission_pct: string;
  team_commission_pct:    string;
  left_leg_pct:           string;
  middle_leg_pct:         string;
  right_leg_pct:          string;
  trigger_mode:           'auto' | 'manual';
  updated_at:             string;
}

export interface ProductCommissionRule {
  id:                     string;
  product:                string;
  product_name:           string;
  product_mrp:            string;
  is_active:              boolean;
  direction:              'top_heavy' | 'bottom_heavy';
  max_upline_levels:      number;
  use_max_levels:         boolean;
  level_percentages:      number[];
  network_commission_pct: string;
  team_commission_pct:    string;
  left_leg_pct:           string;
  middle_leg_pct:         string;
  right_leg_pct:          string;
}

export type EntryStatus = 'pending_window' | 'credited' | 'pending' | 'vacant';

export interface CommissionEntry {
  id:                    string;
  return_window_expires: string | null;
  order_number:          string;
  recipient:             string | null;
  recipient_upa_id:      string;
  recipient_name:        string;
  recipient_mobile:      string;
  entry_type:            'network_upline' | 'team_downline';
  level:                 number | null;
  leg_position:          string;
  amount:                string;
  percentage_applied:    string;
  status:                EntryStatus;
  credited_at:           string | null;
}

export interface CommissionBreakup {
  id:                    string;
  order_item:            string;
  product_name:          string;
  order_number:          string;
  total_base_amount:     string;
  network_pool:          string;
  team_pool:             string;
  status:                string;
  return_window_expires: string | null;
  processed_at:          string | null;
  entries:               CommissionEntry[];
}

// Compact entry/breakup returned inline with each OrderItem from the admin order detail API
export interface CommissionEntryEmbed {
  id:                 string;
  recipient_name:     string;
  recipient_mobile:   string;
  recipient_upa_id:   string;
  entry_type:         'network_upline' | 'team_downline';
  level:              number | null;
  leg_position:       string;
  amount:             string;
  percentage_applied: string;
  status:             EntryStatus;
}

export interface CommissionBreakupEmbed {
  id:                    string;
  total_base_amount:     string;
  network_pool:          string;
  team_pool:             string;
  status:                'pending_window' | 'processing' | 'completed' | 'partial';
  return_window_expires: string | null;
  processed_at:          string | null;
  entries:               CommissionEntryEmbed[];
}
