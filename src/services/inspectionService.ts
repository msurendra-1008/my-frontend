import axiosInstance from '@/utils/axiosInstance';
import type {
  IncomingShipment,
  InspectionReport,
  InspectionReportWriteData,
  InspectionSettings,
} from '@/types/inspection.types';

const BASE = '/api/v1/inspection';

export const inspectionService = {
  getSettings: () =>
    axiosInstance.get<InspectionSettings>(`${BASE}/settings/`),

  updateSettings: (data: Partial<InspectionSettings>) =>
    axiosInstance.patch<InspectionSettings>(`${BASE}/settings/`, data),

  getShipments: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<{ results: IncomingShipment[]; count: number }>(
      `${BASE}/shipments/${qs ? '?' + qs : ''}`,
    );
  },

  getShipment: (id: string) =>
    axiosInstance.get<IncomingShipment>(`${BASE}/shipments/${id}/`),

  submitReport: (id: string, data: InspectionReportWriteData) =>
    axiosInstance.post<InspectionReport>(`${BASE}/shipments/${id}/submit-report/`, data),

  updateStock: (id: string) =>
    axiosInstance.patch<InspectionReport>(`${BASE}/shipments/${id}/update-stock/`),

  downloadDebitNote: (id: string) =>
    axiosInstance.get(`${BASE}/shipments/${id}/debit-note/`, { responseType: 'blob' }),
};
