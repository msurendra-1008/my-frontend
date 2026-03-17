export interface WalletTransaction {
  id:                  string;
  type:                'credit' | 'debit';
  amount:              string;
  reason:              string;
  triggered_by_upa_id: string | null;
  triggered_by_name:   string | null;
  reference:           string;
  created_at:          string;
}

export interface Wallet {
  id:           string;
  upa_id:       string | null;
  balance:      string;
  transactions: WalletTransaction[];
  updated_at:   string;
}

export interface WalletAdminOverview {
  total_balance:       string;
  credited_this_month: string;
  total_wallets:       number;
}

export interface ManualAdjustRequest {
  type:   'credit' | 'debit';
  amount: string | number;
  reason: string;
}

export interface ManualAdjustResponse {
  balance:     string;
  transaction: WalletTransaction;
  message:     string;
}

export interface PaginatedTransactions {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  WalletTransaction[];
}
