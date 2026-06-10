import axiosInstance from '@/utils/axiosInstance';
import type { DashboardStats } from '@/types/dashboard.types';

export const dashboardService = {
  getStats: (params: { period?: string; date_from?: string; date_to?: string }) =>
    axiosInstance.get<DashboardStats>('/api/v1/dashboard/stats/', { params }),
};
