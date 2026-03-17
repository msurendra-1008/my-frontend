import axiosInstance from '@/utils/axiosInstance';
import type {
  MyConnections, TreeNode, UPAProfile,
  UPASearchResult, TreeStats, PaginatedResponse,
} from '@/types/tree.types';

export const treeService = {
  getMyConnections: () =>
    axiosInstance.get<MyConnections>('/api/v1/tree/my-connections/'),

  getStats: () =>
    axiosInstance.get<TreeStats>('/api/v1/tree/stats/'),

  search: (q: string, page = 1) =>
    axiosInstance.get<PaginatedResponse<UPASearchResult>>(
      `/api/v1/tree/search/?q=${encodeURIComponent(q)}&page=${page}`,
    ),

  browse: (page = 1) =>
    axiosInstance.get<PaginatedResponse<TreeNode>>(
      `/api/v1/tree/browse/?page=${page}`,
    ),

  getSubtree: (upaId: string) =>
    axiosInstance.get<TreeNode>(`/api/v1/tree/${upaId}/subtree/`),

  getProfile: (upaId: string) =>
    axiosInstance.get<UPAProfile>(`/api/v1/tree/${upaId}/profile/`),

  toggleActive: (upaId: string) =>
    axiosInstance.patch<{ upa_id: string; is_active: boolean; message: string }>(
      `/api/v1/tree/${upaId}/toggle-active/`,
    ),
};
