import axiosInstance from '@/utils/axiosInstance';
import type {
  Wallet, WalletAdminOverview,
  ManualAdjustRequest, ManualAdjustResponse,
  PaginatedTransactions,
} from '@/types/wallet.types';

export const walletService = {
  getMyWallet: () =>
    axiosInstance.get<Wallet>('/api/v1/wallet/my-wallet/'),

  getMyTransactions: (page = 1) =>
    axiosInstance.get<PaginatedTransactions>(
      `/api/v1/wallet/my-transactions/?page=${page}`,
    ),

  getAdminOverview: () =>
    axiosInstance.get<WalletAdminOverview>('/api/v1/wallet/admin-overview/'),

  getUserWallet: (userId: string) =>
    axiosInstance.get<Wallet>(`/api/v1/wallet/${userId}/user-wallet/`),

  manualAdjust: (userId: string, data: ManualAdjustRequest) =>
    axiosInstance.post<ManualAdjustResponse>(
      `/api/v1/wallet/${userId}/manual-adjust/`,
      data,
    ),
};
