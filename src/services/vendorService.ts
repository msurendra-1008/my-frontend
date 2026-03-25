import axiosInstance from '@/utils/axiosInstance';
import type {
  VendorProfile,
  VendorAdminDetail,
  PaginatedVendors,
  VendorRegisterData,
  VendorLoginResponse,
  VendorDocument,
  VendorProduct,
  VendorProductAdmin,
  PaginatedVendorProducts,
  PaginatedVendorProductsAdmin,
  VendorProductWriteData,
  VendorProductImage,
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

  // ── Vendor products (vendor side) ─────────────────────────────────────────
  listMyProducts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedVendorProducts>(`/api/v1/vendor/products/${qs ? '?' + qs : ''}`);
  },

  createProduct: (data: VendorProductWriteData) =>
    axiosInstance.post<VendorProduct>('/api/v1/vendor/products/', data),

  getProduct: (id: string) =>
    axiosInstance.get<VendorProduct>(`/api/v1/vendor/products/${id}/`),

  updateProduct: (id: string, data: Partial<VendorProductWriteData>) =>
    axiosInstance.patch<VendorProduct>(`/api/v1/vendor/products/${id}/`, data),

  uploadProductImage: (id: string, file: File, opts?: { alt_text?: string; order?: number; is_primary?: boolean }) => {
    const form = new FormData();
    form.append('image', file);
    if (opts?.alt_text)   form.append('alt_text', opts.alt_text);
    if (opts?.order != null) form.append('order', String(opts.order));
    if (opts?.is_primary) form.append('is_primary', 'true');
    return axiosInstance.post<VendorProductImage>(`/api/v1/vendor/products/${id}/images/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteProductImage: (productId: string, imageId: string) =>
    axiosInstance.delete(`/api/v1/vendor/products/${productId}/images/${imageId}/`),

  deactivateProduct: (id: string) =>
    axiosInstance.patch<VendorProduct>(`/api/v1/vendor/products/${id}/deactivate/`, {}),

  reactivateProduct: (id: string) =>
    axiosInstance.patch<VendorProduct>(`/api/v1/vendor/products/${id}/reactivate/`, {}),

  // ── Admin vendor products ─────────────────────────────────────────────────
  adminListProducts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedVendorProductsAdmin>(`/api/v1/vendor/admin-products/${qs ? '?' + qs : ''}`);
  },

  adminGetProduct: (id: string) =>
    axiosInstance.get<VendorProductAdmin>(`/api/v1/vendor/admin-products/${id}/`),

  adminApproveProduct: (id: string) =>
    axiosInstance.patch<VendorProductAdmin>(`/api/v1/vendor/admin-products/${id}/approve/`, {}),

  adminRejectProduct: (id: string, reason: string) =>
    axiosInstance.patch<VendorProductAdmin>(`/api/v1/vendor/admin-products/${id}/reject/`, { reason }),

  adminUpdateProductNotes: (id: string, admin_notes: string) =>
    axiosInstance.patch<{ admin_notes: string }>(`/api/v1/vendor/admin-products/${id}/notes/`, { admin_notes }),
};
