export interface PeriodInfo {
  label: string;
  start: string;
  end:   string;
}

export interface OrderStats {
  total:            number;
  total_change:     number | null;
  revenue:          number;
  revenue_change:   number | null;
  upa_count:        number;
  upa_revenue:      number;
  regular_count:    number;
  regular_revenue:  number;
  offline_count:    number;
  offline_revenue:  number;
  online_count:     number;
  online_revenue:   number;
  status_breakdown: Record<string, number>;
}

export interface UPAStats {
  total:      number;
  active:     number;
  inactive:   number;
  standalone: number;
  new:        number;
  monthly:    { month: string; count: number }[];
}

export interface CommissionStats {
  pending_amount: number;
  pending_count:  number;
  inactive_count: number;
  vacant_count:   number;
  distributed:    number;
  breakdown: {
    network:  number;
    team:     number;
    social:   number;
    company:  number;
    self:     number;
  };
}

export interface WalletStats {
  balance:     number;
  period_in:   number;
  period_out:  number;
  gst_pending: number;
}

export interface ProductAlert {
  id:     string;
  name:   string;
  stock?: number;
  type:   'low_stock' | 'out_of_stock' | 'no_pricing' | 'no_rule';
}

export interface ProductStats {
  total:      number;
  no_pricing: number;
  no_rule:    number;
  alerts:     ProductAlert[];
}

export interface TopProduct {
  product_name: string;
  order_count:  number;
  revenue:      number;
}

export interface DailyRevenue {
  date:    string;
  revenue: number;
}

export interface RecentOrder {
  id:           string;
  order_number: string;
  customer:     string;
  total:        number;
  status:       string;
  order_type:   'upa' | 'regular';
  created_at:   string;
}

export interface DashboardStats {
  period:        PeriodInfo;
  orders:        OrderStats;
  upa:           UPAStats;
  employees:     { total: number };
  commissions:   CommissionStats;
  wallet:        WalletStats;
  products:      ProductStats;
  top_products:  TopProduct[];
  daily_revenue: DailyRevenue[];
  recent_orders: RecentOrder[];
  tenders:       { open: number };
}
