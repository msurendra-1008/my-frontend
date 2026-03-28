import axiosInstance from '@/utils/axiosInstance';
import type { Warehouse, Zone, Rack, RackStock, StockMovement, StockTransfer } from '@/types/warehouse.types';

const BASE = '/api/v1/warehouse';

// All list endpoints return paginated responses: { count, next, previous, results: T[] }
interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

export const warehouseService = {
  // ── Warehouses ──────────────────────────────────────────────────────────────
  getWarehouses: () =>
    axiosInstance.get<Paginated<Warehouse>>(`${BASE}/warehouses/`),

  createWarehouse: (data: { name: string; location?: string }) =>
    axiosInstance.post<Warehouse>(`${BASE}/warehouses/`, data),

  updateWarehouse: (id: string, data: Partial<Warehouse>) =>
    axiosInstance.patch<Warehouse>(`${BASE}/warehouses/${id}/`, data),

  // ── Zones ───────────────────────────────────────────────────────────────────
  getZones: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<Paginated<Zone>>(`${BASE}/zones/${qs ? '?' + qs : ''}`);
  },

  createZone: (data: { warehouse: string; name: string }) =>
    axiosInstance.post<Zone>(`${BASE}/zones/`, data),

  updateZone: (id: string, data: Partial<Zone>) =>
    axiosInstance.patch<Zone>(`${BASE}/zones/${id}/`, data),

  // ── Racks ───────────────────────────────────────────────────────────────────
  getRacks: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<Paginated<Rack>>(`${BASE}/racks/${qs ? '?' + qs : ''}`);
  },

  createRack: (data: { zone: string; code: string; capacity?: number }) =>
    axiosInstance.post<Rack>(`${BASE}/racks/`, data),

  updateRack: (id: string, data: Partial<Rack>) =>
    axiosInstance.patch<Rack>(`${BASE}/racks/${id}/`, data),

  // ── Stock ───────────────────────────────────────────────────────────────────
  getStock: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<Paginated<RackStock>>(`${BASE}/stock/${qs ? '?' + qs : ''}`);
  },

  assignStock: (data: { rack: string; variant: string; quantity: number; reference?: string; notes?: string }) =>
    axiosInstance.post<{ rack_stock: RackStock; capacity_warning: boolean }>(`${BASE}/stock/assign/`, data),

  adjustStock: (data: { rack: string; variant: string; new_quantity: number; notes?: string }) =>
    axiosInstance.post<RackStock>(`${BASE}/stock/adjust/`, data),

  transferStock: (data: { from_rack: string; to_rack: string; variant: string; quantity: number; notes?: string }) =>
    axiosInstance.post<{ transfer: StockTransfer; capacity_warning: boolean }>(`${BASE}/stock/transfer/`, data),

  getMovements: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<Paginated<StockMovement>>(`${BASE}/stock/movements/${qs ? '?' + qs : ''}`);
  },

  getTransfers: () =>
    axiosInstance.get<Paginated<StockTransfer>>(`${BASE}/stock/transfers/`),
};
