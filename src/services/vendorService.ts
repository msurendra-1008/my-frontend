import axiosInstance from '@/utils/axiosInstance';
import type {
  VendorProfile,
  VendorAdminDetail,
  PaginatedVendors,
  VendorRegisterData,
  VendorLoginResponse,
  VendorDocument,
} from '@/types/vendor.types';

export const vendorService = {
  // ── Public auth ───────────────────────────────────────────────────────────
  register: (data: VendorRegisterData) =>
    axiosInstance.post<VendorLoginResponse>('/api/v1/vendor/register/', data),

  login: (identifier: string, password: string) =>
    axiosInstance.post<VendorLoginResponse>('/api/v1/vendor/login/', { identifier, password }),

  // ── Vendor profile ────────────────────────────────────────────────────────
  getMe: () =>
    axiosInstance.get<VendorProfile>('/api/v1/vendor/profile/me/'),

  updateProfile: (data: Partial<VendorProfile> & { category_ids?: string[] }) =>
    axiosInstance.patch<VendorProfile>('/api/v1/vendor/profile/me/update/', data),

  uploadDocument: (label: string, file: File) => {
    const form = new FormData();
    form.append('label', label);
    form.append('file', file);
    return axiosInstance.post<VendorDocument>('/api/v1/vendor/profile/me/documents/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument: (docId: string) =>
    axiosInstance.delete(`/api/v1/vendor/profile/${docId}/documents/`),

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminList: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedVendors>(`/api/v1/vendor/admin/${qs ? '?' + qs : ''}`);
  },

  adminGet: (id: string) =>
    axiosInstance.get<VendorAdminDetail>(`/api/v1/vendor/admin/${id}/`),

  approve: (id: string) =>
    axiosInstance.patch<VendorAdminDetail>(`/api/v1/vendor/admin/${id}/approve/`, {}),

  reject: (id: string, reason: string) =>
    axiosInstance.patch<VendorAdminDetail>(`/api/v1/vendor/admin/${id}/reject/`, { reason }),

  requestDocs: (id: string, admin_notes: string) =>
    axiosInstance.patch<VendorAdminDetail>(`/api/v1/vendor/admin/${id}/request-docs/`, { admin_notes }),

  updateAdminNotes: (id: string, admin_notes: string) =>
    axiosInstance.patch<{ admin_notes: string }>(`/api/v1/vendor/admin/${id}/notes/`, { admin_notes }),
};
