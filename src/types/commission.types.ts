export interface CommissionSettings {
  id:                     string;
  is_enabled:             boolean;
  direction:              'top_heavy' | 'bottom_heavy';
  levels:                 number;
  level_percentages:      number[];
  network_commission_pct: string;
  team_commission_pct:    string;
  left_leg_pct:           string;
  middle_leg_pct:         string;
  right_leg_pct:          string;
  updated_at:             string;
}

export interface ProductCommissionRule {
  id:                     string;
  product:                string;
  product_name:           string;
  product_mrp:            string;
  is_enabled:             boolean;
  direction:              'top_heavy' | 'bottom_heavy';
  levels:                 number;
  level_percentages:      number[];
  network_commission_pct: string;
  team_commission_pct:    string;
  left_leg_pct:           string;
  middle_leg_pct:         string;
  right_leg_pct:          string;
}

export interface CommissionEntry {
  id:                    string;
  breakup:               string;
  order_number:          string;
  beneficiary:           string;
  beneficiary_name:      string;
  beneficiary_upa_id:    string;
  level:                 number;
  rate:                  string;
  amount:                string;
  status:                'pending' | 'credited' | 'cancelled';
  credited_at:           string | null;
  return_window_expires: string | null;
}

export interface CommissionBreakup {
  id:                    string;
  order:                 string;
  order_number:          string;
  direction:             'top_heavy' | 'bottom_heavy';
  return_window_expires: string | null;
  entries:               CommissionEntry[];
}
