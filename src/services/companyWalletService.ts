import axiosInstance from '@/utils/axiosInstance';
import type {
  CompanyWallet,
  CompanyTransaction,
  GSTLedgerEntry,
  CompanyWalletStats,
  ManualEntryPayload,
} from '@/types/companyWallet.types';

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

export const companyWalletService = {
  getOverview: () =>
    axiosInstance.get<CompanyWallet>('/api/v1/company-wallet/overview/'),

  getStats: () =>
    axiosInstance.get<CompanyWalletStats>('/api/v1/company-wallet/stats/'),

  getTransactions: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<CompanyTransaction>>('/api/v1/company-wallet/transactions/', { params }),

  getGSTLedger: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<GSTLedgerEntry>>('/api/v1/company-wallet/gst-ledger/', { params }),

  recordManualEntry: (data: ManualEntryPayload) =>
    axiosInstance.post<CompanyWallet>('/api/v1/company-wallet/manual-entry/', data),
};
