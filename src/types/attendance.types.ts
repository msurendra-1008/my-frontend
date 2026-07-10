export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'leave'
  | 'holiday'
  | 'week_off'
  | 'future'

export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid' | 'other'

export interface PublicHoliday {
  id:         string
  date:       string
  name:       string
  is_active:  boolean
  created_at: string
}

export interface LeaveBalance {
  id:           string
  employee:     string
  employee_name: string
  employee_code: string
  year:         number
  casual_leave: string
  sick_leave:   string
  earned_leave: string
  updated_at:   string
}

export interface AttendanceRecord {
  id:            string
  employee:      string
  employee_name: string
  employee_code: string
  date:          string
  status:        AttendanceStatus
  leave_type:    LeaveType | null
  notes:         string
  marked_by:     string | null
  marked_by_name: string | null
  created_at:    string
  updated_at:    string
}

export interface CalendarDay {
  date:       string
  day_num:    number
  day_name:   string
  status:     AttendanceStatus
  leave_type: LeaveType | null
  notes:      string
  is_today:   boolean
  is_future:  boolean
  is_sunday:  boolean
  record_id:  string | null
}

export interface MonthlySummary {
  present:      number
  absent:       number
  half_day:     number
  leave:        number
  holiday:      number
  week_off:     number
  working_days: number
  paid_days:    number
}

export interface EmployeeCalendar {
  employee_id:   string
  employee_name: string
  employee_code: string
  year:          number
  month:         number
  month_name:    string
  days_in_month: number
  days:          CalendarDay[]
  summary:       MonthlySummary
}

export interface MarkAttendancePayload {
  employee:   string
  date:       string
  status:     AttendanceStatus
  leave_type?: LeaveType | null
  notes?:     string
}

export interface BulkMarkPayload {
  employee_ids: string[]
  date:         string
  status:       AttendanceStatus
  leave_type?:  LeaveType | null
  notes?:       string
}
