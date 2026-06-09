export type TxType =
  | 'order_received'
  | 'commission_paid'
  | 'refund_paid'
  | 'gst_collected'
  | 'gst_paid'
  | 'manual_credit'
  | 'manual_debit';

export type GSTType = 'collected' | 'paid';

export interface CompanyWallet {
  id:         string;
  balance:    string;
  updated_at: string;
}

export interface CompanyTransaction {
  id:               string;
  transaction_type: TxType;
  amount:           string;
  balance_after:    string;
  description:      string;
  order_number:     string | null;
  created_at:       string;
}

export interface GSTLedgerEntry {
  id:           string;
  gst_type:     GSTType;
  amount:       string;
  description:  string;
  reference:    string;
  order_number: string | null;
  created_at:   string;
}

export interface CompanyWalletStats {
  balance:       string;
  total_in:      string;
  total_out:     string;
  tx_count:      number;
  gst_collected: string;
  gst_paid:      string;
}

export interface ManualEntryPayload {
  tx_type:     'manual_credit' | 'manual_debit';
  amount:      string;
  description: string;
}
