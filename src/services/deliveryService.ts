import axiosInstance from '@/utils/axiosInstance';
import type {
  DeliveryZone, DeliveryPartner, DeliverySettings,
  DeliveryAssignment, PartnerAssignment, Paginated, UnassignedOrder,
} from '@/types/delivery.types';

// ── Zones ─────────────────────────────────────────────────────────────────────

export const deliveryService = {
  // Zones
  getZones: () =>
    axiosInstance.get<Paginated<DeliveryZone>>('/api/v1/delivery/zones/'),

  createZone: (data: Partial<DeliveryZone>) =>
    axiosInstance.post<DeliveryZone>('/api/v1/delivery/zones/', data),

  updateZone: (id: string, data: Partial<DeliveryZone>) =>
    axiosInstance.patch<DeliveryZone>(`/api/v1/delivery/zones/${id}/`, data),

  deleteZone: (id: string) =>
    axiosInstance.delete(`/api/v1/delivery/zones/${id}/`),

  // Partners
  getPartners: () =>
    axiosInstance.get<Paginated<DeliveryPartner>>('/api/v1/delivery/partners/'),

  createPartner: (data: { user: string; vehicle_type: string; vehicle_number?: string; zone_ids?: string[] }) =>
    axiosInstance.post<DeliveryPartner>('/api/v1/delivery/partners/', data),

  updatePartner: (id: string, data: Partial<DeliveryPartner> & { zone_ids?: string[] }) =>
    axiosInstance.patch<DeliveryPartner>(`/api/v1/delivery/partners/${id}/`, data),

  // Settings
  getSettings: () =>
    axiosInstance.get<DeliverySettings>('/api/v1/delivery/settings/'),

  updateSettings: (data: Partial<DeliverySettings>) =>
    axiosInstance.patch<DeliverySettings>('/api/v1/delivery/settings/', data),

  // Unassigned packed orders (admin)
  getUnassignedOrders: () =>
    axiosInstance.get<UnassignedOrder[]>('/api/v1/delivery/admin/unassigned/'),

  // Assignments (admin)
  getAssignments: (params?: { status?: string; partner?: string }) =>
    axiosInstance.get<Paginated<DeliveryAssignment>>('/api/v1/delivery/assignments/', { params }),

  getAssignment: (id: string) =>
    axiosInstance.get<DeliveryAssignment>(`/api/v1/delivery/assignments/${id}/`),

  suggestPartners: (orderId: string) =>
    axiosInstance.get<{ eligible_partners: DeliveryPartner[] }>(
      `/api/v1/delivery/assignments/suggest/${orderId}/`
    ),

  assignPartner: (orderId: string, partnerId: string) =>
    axiosInstance.post<DeliveryAssignment>('/api/v1/delivery/assignments/assign/', {
      order_id: orderId, partner_id: partnerId,
    }),

  autoAssign: (orderId: string) =>
    axiosInstance.post<DeliveryAssignment>('/api/v1/delivery/assignments/auto-assign/', {
      order_id: orderId,
    }),

  // Partner self-service
  getMyAssignments: (params?: { status?: string }) =>
    axiosInstance.get<Paginated<PartnerAssignment>>('/api/v1/delivery/my-assignments/', { params }),

  updateMyStatus: (assignmentId: string, formData: FormData) =>
    axiosInstance.post<PartnerAssignment>(
      `/api/v1/delivery/my-assignments/${assignmentId}/update-status/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
};
