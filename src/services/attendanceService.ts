import axiosInstance from '@/utils/axiosInstance'
import type {
  PublicHoliday,
  LeaveBalance,
  AttendanceRecord,
  EmployeeCalendar,
  MarkAttendancePayload,
  BulkMarkPayload,
} from '@/types/attendance.types'

interface Paginated<T> {
  count:    number
  next:     string | null
  previous: string | null
  results:  T[]
}

export const attendanceService = {
  // ── Public Holidays ─────────────────────────────────────
  getHolidays: (params?: Record<string, string>) =>
    axiosInstance.get<PublicHoliday[]>('/api/v1/hr/holidays/', { params }),

  createHoliday: (data: { date: string; name: string; is_active?: boolean }) =>
    axiosInstance.post<PublicHoliday>('/api/v1/hr/holidays/', data),

  updateHoliday: (id: string, data: Partial<{ date: string; name: string; is_active: boolean }>) =>
    axiosInstance.patch<PublicHoliday>(`/api/v1/hr/holidays/${id}/`, data),

  deleteHoliday: (id: string) =>
    axiosInstance.delete(`/api/v1/hr/holidays/${id}/`),

  // ── Leave Balances ───────────────────────────────────────
  getLeaveBalances: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<LeaveBalance>>('/api/v1/hr/leave-balances/', { params }),

  upsertLeaveBalance: (data: {
    employee: string
    year: number
    casual_leave?: number
    sick_leave?: number
    earned_leave?: number
  }) =>
    axiosInstance.post<LeaveBalance>('/api/v1/hr/leave-balances/', data),

  updateLeaveBalance: (id: string, data: Partial<{ casual_leave: number; sick_leave: number; earned_leave: number }>) =>
    axiosInstance.patch<LeaveBalance>(`/api/v1/hr/leave-balances/${id}/`, data),

  // ── Attendance Records ───────────────────────────────────
  getRecords: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<AttendanceRecord>>('/api/v1/hr/attendance/', { params }),

  // ── Calendar (per employee per month) ───────────────────
  getCalendar: (employeeId: string, year: number, month: number) =>
    axiosInstance.get<EmployeeCalendar>(
      `/api/v1/hr/attendance/calendar/${employeeId}/`,
      { params: { year, month } },
    ),

  // ── Mark single ─────────────────────────────────────────
  markAttendance: (data: MarkAttendancePayload) =>
    axiosInstance.post<AttendanceRecord>('/api/v1/hr/attendance/mark/', data),

  // ── Bulk mark ────────────────────────────────────────────
  bulkMark: (data: BulkMarkPayload) =>
    axiosInstance.post<{ marked: number; errors: { employee_id: string; error: string }[] }>(
      '/api/v1/hr/attendance/bulk-mark/',
      data,
    ),

  // ── Export ───────────────────────────────────────────────
  getExportUrl: (employeeId: string, year: number, month: number, format: 'excel' | 'pdf' = 'excel') =>
    `/api/v1/hr/attendance/export/?employee=${employeeId}&year=${year}&month=${month}&format=${format}`,
}
