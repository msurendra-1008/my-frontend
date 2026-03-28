import axiosInstance from '@/utils/axiosInstance';
import type {
  ProcurementRequirement,
  PaginatedRequirements,
  PaginatedPOs,
  PurchaseOrder,
  VendorResponseWriteData,
} from '@/types/procurement.types';

const BASE = '/api/v1/procurement';

export const procurementService = {
  // ── Admin: requirements ───────────────────────────────────────────────────
  listRequirements: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedRequirements>(`${BASE}/requirements/${qs ? '?' + qs : ''}`);
  },

  createRequirement: (data: {
    vendor_product_id: string;
    required_quantity: number;
    required_by_date: string;
    target_price?: string | null;
    notes?: string;
  }) => axiosInstance.post<ProcurementRequirement>(`${BASE}/requirements/`, data),

  getRequirement: (id: string) =>
    axiosInstance.get<ProcurementRequirement>(`${BASE}/requirements/${id}/`),

  updateRequirement: (id: string, data: {
    required_quantity?: number;
    required_by_date?: string;
    target_price?: string | null;
    notes?: string;
  }) => axiosInstance.patch<ProcurementRequirement>(`${BASE}/requirements/${id}/`, data),

  sendRequirement: (id: string) =>
    axiosInstance.patch<ProcurementRequirement>(`${BASE}/requirements/${id}/send/`, {}),

  negotiateRequirement: (id: string, negotiation_notes: string) =>
    axiosInstance.patch<ProcurementRequirement>(`${BASE}/requirements/${id}/negotiate/`, { negotiation_notes }),

  confirmRequirement: (id: string) =>
    axiosInstance.patch<ProcurementRequirement>(`${BASE}/requirements/${id}/confirm/`, {}),

  cancelRequirement: (id: string, cancellation_reason: string) =>
    axiosInstance.patch<ProcurementRequirement>(`${BASE}/requirements/${id}/cancel/`, { cancellation_reason }),

  // ── Admin: purchase orders ────────────────────────────────────────────────
  listPOs: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedPOs>(`${BASE}/purchase-orders/${qs ? '?' + qs : ''}`);
  },

  getPO: (id: string) =>
    axiosInstance.get<PurchaseOrder>(`${BASE}/purchase-orders/${id}/`),

  adminUpdatePOStatus: (id: string, status: string, admin_notes?: string) =>
    axiosInstance.patch<PurchaseOrder>(`${BASE}/purchase-orders/${id}/admin-status/`, { status, admin_notes }),

  // ── Vendor: requirements ──────────────────────────────────────────────────
  getVendorRequirements: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedRequirements>(`${BASE}/vendor-requirements/${qs ? '?' + qs : ''}`);
  },

  getVendorRequirement: (id: string) =>
    axiosInstance.get<ProcurementRequirement>(`${BASE}/vendor-requirements/${id}/`),

  submitResponse: (id: string, data: VendorResponseWriteData) =>
    axiosInstance.post<ProcurementRequirement>(`${BASE}/vendor-requirements/${id}/respond/`, data),

  updateResponse: (id: string, data: Partial<VendorResponseWriteData>) =>
    axiosInstance.patch<ProcurementRequirement>(`${BASE}/vendor-requirements/${id}/update-response/`, data),

  // ── Vendor: POs ───────────────────────────────────────────────────────────
  getVendorPOs: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedPOs>(`${BASE}/purchase-orders/vendor/${qs ? '?' + qs : ''}`);
  },

  getVendorPO: (id: string) =>
    axiosInstance.get<PurchaseOrder>(`${BASE}/purchase-orders/vendor/${id}/`),

  acknowledgePO: (id: string) =>
    axiosInstance.patch<PurchaseOrder>(`${BASE}/purchase-orders/${id}/acknowledge/`, {}),

  dispatchPO: (id: string, vendor_notes?: string) =>
    axiosInstance.patch<PurchaseOrder>(`${BASE}/purchase-orders/${id}/dispatch/`, { vendor_notes }),
};
