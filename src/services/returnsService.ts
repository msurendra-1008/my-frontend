import axiosInstance from '@/utils/axiosInstance';
import type {
  ReturnSettings,
  ReturnRequest,
  ReturnRequestCreate,
  PaginatedReturnRequests,
  ReturnPhoto,
} from '@/types/returns.types';

export const returnsService = {
  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings: () =>
    axiosInstance.get<ReturnSettings>('/api/v1/return-settings/'),

  updateSettings: (data: Partial<ReturnSettings>) =>
    axiosInstance.patch<ReturnSettings>('/api/v1/return-settings/', data),

  // ── User ────────────────────────────────────────────────────────────────────
  getMyRequests: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedReturnRequests>(
      `/api/v1/returns/my-requests/${qs ? '?' + qs : ''}`,
    );
  },

  createRequest: (data: ReturnRequestCreate) =>
    axiosInstance.post<ReturnRequest>('/api/v1/returns/', data),

  getRequest: (id: string) =>
    axiosInstance.get<ReturnRequest>(`/api/v1/returns/${id}/`),

  userReply: (id: string, notes: string) =>
    axiosInstance.post<ReturnRequest>(`/api/v1/returns/${id}/user-reply/`, { notes }),

  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return axiosInstance.post<ReturnPhoto>(`/api/v1/returns/${id}/upload-photo/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  adminList: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedReturnRequests>(
      `/api/v1/returns/admin/${qs ? '?' + qs : ''}`,
    );
  },

  adminDetail: (id: string) =>
    axiosInstance.get<ReturnRequest>(`/api/v1/returns/${id}/admin/`),

  approve: (id: string) =>
    axiosInstance.patch<ReturnRequest>(`/api/v1/returns/${id}/approve/`),

  reject: (id: string, adminNotes: string) =>
    axiosInstance.patch<ReturnRequest>(`/api/v1/returns/${id}/reject/`, { admin_notes: adminNotes }),

  requestInfo: (id: string, adminNotes: string) =>
    axiosInstance.patch<ReturnRequest>(`/api/v1/returns/${id}/request-info/`, { admin_notes: adminNotes }),
};
