export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'
export type PayrollStatus  = 'pending' | 'paid'

export interface Department {
  id:   string
  name: string
}

export interface SalaryStructure {
  id:              string
  basic:           string
  hra:             string
  da:              string
  transport:       string
  other_allowance: string
  pf_deduction:    string
  esi_deduction:   string
  tds_deduction:   string
  other_deduction: string
  gross_salary:    string
  total_deductions: string
  net_salary:      string
  effective_from:  string
  created_at:      string
  updated_at:      string
}

export interface EmployeeProfile {
  id:              string
  user:            string
  full_name:       string
  email:           string
  mobile:          string
  role:            string
  employee_code:   string
  department:      string | null
  department_name: string | null
  designation:     string
  employment_type: EmploymentType
  date_of_joining: string | null
  bank_name:       string
  bank_account:    string
  bank_ifsc:       string
  is_active:       boolean
  salary_structure: SalaryStructure | null
  created_at:      string
  updated_at:      string
}

export interface CreateEmployeeProfilePayload {
  user:            string
  employee_code:   string
  department?:     string | null
  designation?:    string
  employment_type?: EmploymentType
  date_of_joining?: string | null
  bank_name?:      string
  bank_account?:   string
  bank_ifsc?:      string
}

export interface UpdateEmployeeProfilePayload {
  employee_code?:   string
  department?:      string | null
  designation?:     string
  employment_type?: EmploymentType
  date_of_joining?: string | null
  bank_name?:       string
  bank_account?:    string
  bank_ifsc?:       string
  is_active?:       boolean
}

export interface SalaryStructurePayload {
  basic:           number
  hra:             number
  da:              number
  transport:       number
  other_allowance: number
  pf_deduction:    number
  esi_deduction:   number
  tds_deduction:   number
  other_deduction: number
  effective_from:  string
}

export interface PayrollMonth {
  id:               string
  employee:         string
  employee_name:    string
  employee_code:    string
  department_name:  string | null
  designation:      string
  month:            number
  year:             number
  basic:            string
  hra:              string
  da:               string
  transport:        string
  other_allowance:  string
  gross_salary:     string
  pf_deduction:     string
  esi_deduction:    string
  tds_deduction:    string
  other_deduction:  string
  total_deductions: string
  net_salary:       string
  status:           PayrollStatus
  paid_at:          string | null
  paid_by:          string | null
  paid_by_name:     string | null
  notes:            string
  created_at:       string
  updated_at:       string
}

export interface GeneratePayrollPayload {
  month: number
  year:  number
}
