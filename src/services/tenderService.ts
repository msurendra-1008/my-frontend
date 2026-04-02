import axiosInstance from '@/utils/axiosInstance';

const BASE = '/api/v1/vendor-tender';

export const tenderService = {
  getVendorTenders: (params?: Record<string, string>) =>
    axiosInstance.get(`${BASE}/`, { params }),

  getTender: (id: string) =>
    axiosInstance.get(`${BASE}/${id}/`),

  submitBid: (tenderId: string, data: unknown) =>
    axiosInstance.post(`${BASE}/${tenderId}/bid/`, data),

  getMyBids: () =>
    axiosInstance.get(`${BASE}/my_bids/`),
};
