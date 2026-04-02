import axiosInstance from '@/utils/axiosInstance'
import type { Tender, TenderListItem, BidComparison } from '@/types/tender.types'

export const tenderService = {
  // Admin
  getTenders: (params?: Record<string, string>) =>
    axiosInstance.get<{ results: TenderListItem[]; count: number }>(
      '/api/v1/tender/', { params }),

  createTender: (data: unknown) =>
    axiosInstance.post<Tender>('/api/v1/tender/', data),

  getTender: (id: string) =>
    axiosInstance.get<Tender>(`/api/v1/tender/${id}/`),

  openTender: (id: string) =>
    axiosInstance.patch(`/api/v1/tender/${id}/open/`),

  closeTender: (id: string) =>
    axiosInstance.patch(`/api/v1/tender/${id}/close/`),

  awardTender: (id: string, data: unknown) =>
    axiosInstance.post(`/api/v1/tender/${id}/award/`, data),

  cancelTender: (id: string, reason: string) =>
    axiosInstance.patch(`/api/v1/tender/${id}/cancel/`, { reason }),

  negotiate: (tenderId: string, bidId: string, notes: string) =>
    axiosInstance.patch(
      `/api/v1/tender/${tenderId}/bids/${bidId}/negotiate/`,
      { negotiation_notes: notes }),

  getComparison: (id: string) =>
    axiosInstance.get<BidComparison[]>(`/api/v1/tender/${id}/comparison/`),

  // Vendor
  getVendorTenders: () =>
    axiosInstance.get<import('@/types/tender.types').VendorTender[]>(`/api/v1/tender/vendor/`),

  getVendorTender: (id: string) =>
    axiosInstance.get<import('@/types/tender.types').VendorTender>(`/api/v1/tender/vendor/${id}/`),

  submitBid: (tenderId: string, data: unknown) =>
    axiosInstance.post(`/api/v1/tender/vendor/${tenderId}/bid/`, data),

  updateBid: (tenderId: string, data: unknown) =>
    axiosInstance.patch(`/api/v1/tender/vendor/${tenderId}/bid/`, data),

  withdrawBid: (tenderId: string) =>
    axiosInstance.delete(`/api/v1/tender/vendor/${tenderId}/bid/`),

  addVendorComment: (tenderId: string, message: string) =>
    axiosInstance.post(`/api/v1/tender/vendor/${tenderId}/comment/`, { message }),
}
