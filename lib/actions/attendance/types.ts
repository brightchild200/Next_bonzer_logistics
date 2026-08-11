export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'ON_LEAVE';
export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT';

export interface AttendanceRecord {
  id: string;
  salesperson_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_minutes: number | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLocation {
  id: string;
  attendance_id: string;
  event_type: AttendanceEventType;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  captured_at: string;
  created_at: string;
}

export interface CheckInInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CheckOutInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type CheckInResult =
  | { success: true; attendance: AttendanceRecord }
  | { success: false; error: string };

export type CheckOutResult =
  | { success: true; attendance: AttendanceRecord }
  | { success: false; error: string };

export type GetTodayAttendanceResult =
  | { success: true; attendance: AttendanceRecord | null }
  | { success: false; error: string };

export interface ListAttendanceParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  salespersonId?: string;
}

export type ListAttendanceResult =
  | { success: true; records: AttendanceRecord[]; totalCount: number }
  | { success: false; error: string };

export interface AttendanceProgress {
  customer_interactions: number;
  enquiries: number;
  jobs: number;
}

export interface TargetWithProgress {
  id: string;
  salesperson_id: string;
  metric: 'CUSTOMER_INTERACTIONS' | 'ENQUIRIES' | 'JOBS';
  target_value: number;
  period_start: string;
  period_end: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  progress: AttendanceProgress;
  achievement_percentage: number;
}
