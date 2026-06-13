import axiosInstance from '@/utils/axiosInstance'
import type {
  Department,
  EmployeeProfile,
  CreateEmployeeProfilePayload,
  UpdateEmployeeProfilePayload,
  SalaryStructurePayload,
  PayrollMonth,
  GeneratePayrollPayload,
} from '@/types/payroll.types'

interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const payrollService = {
  // Departments
  getDepartments: () =>
    axiosInstance.get<Department[]>('/api/v1/hr/departments/'),

  createDepartment: (data: { name: string }) =>
    axiosInstance.post<Department>('/api/v1/hr/departments/', data),

  deleteDepartment: (id: string) =>
    axiosInstance.delete(`/api/v1/hr/departments/${id}/`),

  // Employee profiles
  getEmployees: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<EmployeeProfile>>('/api/v1/hr/employees/', { params }),

  getEmployee: (id: string) =>
    axiosInstance.get<EmployeeProfile>(`/api/v1/hr/employees/${id}/`),

  createEmployee: (data: CreateEmployeeProfilePayload) =>
    axiosInstance.post<EmployeeProfile>('/api/v1/hr/employees/', data),

  updateEmployee: (id: string, data: UpdateEmployeeProfilePayload) =>
    axiosInstance.patch<EmployeeProfile>(`/api/v1/hr/employees/${id}/`, data),

  // Salary structure
  upsertSalaryStructure: (employeeId: string, data: SalaryStructurePayload) =>
    axiosInstance.post(`/api/v1/hr/employees/${employeeId}/salary-structure/`, data),

  // Payroll months
  getPayroll: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<PayrollMonth>>('/api/v1/hr/payroll/', { params }),

  generatePayroll: (data: GeneratePayrollPayload) =>
    axiosInstance.post<{ created: number; skipped: number }>('/api/v1/hr/payroll/generate/', data),

  payEmployee: (id: string) =>
    axiosInstance.post<PayrollMonth>(`/api/v1/hr/payroll/${id}/pay/`),

  getSalarySlipUrl: (id: string) => `/api/v1/hr/payroll/${id}/slip/`,
}
