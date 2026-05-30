export interface CommissionSettings {
  id:                string;
  is_enabled:        boolean;
  direction:         'upline' | 'downline';
  levels:            number;
  level_percentages: number[];
  updated_at:        string;
}

export interface ProductCommissionRule {
  id:                string;
  product:           string;
  product_name:      string;
  is_enabled:        boolean;
  direction:         'upline' | 'downline';
  levels:            number;
  level_percentages: number[];
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
  direction:             'upline' | 'downline';
  return_window_expires: string | null;
  entries:               CommissionEntry[];
}
