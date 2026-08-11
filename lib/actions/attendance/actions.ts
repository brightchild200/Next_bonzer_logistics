'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  AttendanceRecord,
  AttendanceLocation,
  CheckInInput,
  CheckInResult,
  CheckOutInput,
  CheckOutResult,
  GetTodayAttendanceResult,
  ListAttendanceParams,
  ListAttendanceResult,
} from './types';

function validateLatitude(lat: number): string | null {
  if (lat < -90 || lat > 90) {
    return 'Latitude must be between -90 and 90';
  }
  return null;
}

function validateLongitude(lng: number): string | null {
  if (lng < -180 || lng > 180) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
}

function validateAccuracy(acc?: number): string | null {
  if (acc !== undefined && acc < 0) {
    return 'Accuracy must be non-negative';
  }
  return null;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function getUserAndPermissions(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, permissions: [] as Permission[], error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError || !authContext) {
    return { user, permissions: [] as Permission[], error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  return { user, permissions: userPermissions, error: null };
}

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const supabase = createClient();

  const latError = validateLatitude(input.latitude);
  if (latError) return { success: false, error: latError };

  const lngError = validateLongitude(input.longitude);
  if (lngError) return { success: false, error: lngError };

  const accError = validateAccuracy(input.accuracy);
  if (accError) return { success: false, error: accError };

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (!permissions.includes(PERMISSIONS.ATTENDANCE.CHECK_IN)) {
    return { success: false, error: 'Insufficient permissions to check in' };
  }

  const today = getTodayDateString();

  // Check if attendance record already exists for today
  const { data: existingAttendance } = await supabase
    .from('sales_attendance')
    .select('id, status, check_in_time')
    .eq('salesperson_id', user.id)
    .eq('attendance_date', today)
    .maybeSingle();

  if (existingAttendance) {
    if (existingAttendance.status === 'CHECKED_IN' || existingAttendance.check_in_time) {
      return { success: false, error: 'Already checked in today' };
    }
    // If status is ABSENT or ON_LEAVE but no check_in_time, allow check-in
  }

  const now = new Date().toISOString();

  // Create or update attendance record
  let attendanceId: string;
  let attendance: AttendanceRecord;

  if (existingAttendance) {
    // Update existing record
    const { data, error } = await supabase
      .from('sales_attendance')
      .update({
        check_in_time: now,
        status: 'CHECKED_IN',
        updated_at: now,
      })
      .eq('id', existingAttendance.id)
      .select()
      .single();

    if (error) {
      console.error('Check-in update error:', error);
      return { success: false, error: error.message };
    }
    attendanceId = data.id;
    attendance = data as AttendanceRecord;
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('sales_attendance')
      .insert({
        salesperson_id: user.id,
        attendance_date: today,
        check_in_time: now,
        status: 'CHECKED_IN',
      })
      .select()
      .single();

    if (error) {
      console.error('Check-in insert error:', error);
      return { success: false, error: error.message };
    }
    attendanceId = data.id;
    attendance = data as AttendanceRecord;
  }

  // Create location audit record
  const { error: locationError } = await supabase
    .from('sales_attendance_locations')
    .insert({
      attendance_id: attendanceId,
      event_type: 'CHECK_IN',
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      captured_at: now,
    });

  if (locationError) {
    console.error('Check-in location error:', locationError);
    // Don't fail the check-in, just log the error
  }

  return { success: true, attendance };
}

export async function checkOut(input: CheckOutInput): Promise<CheckOutResult> {
  const supabase = createClient();

  const latError = validateLatitude(input.latitude);
  if (latError) return { success: false, error: latError };

  const lngError = validateLongitude(input.longitude);
  if (lngError) return { success: false, error: lngError };

  const accError = validateAccuracy(input.accuracy);
  if (accError) return { success: false, error: accError };

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (!permissions.includes(PERMISSIONS.ATTENDANCE.CHECK_OUT)) {
    return { success: false, error: 'Insufficient permissions to check out' };
  }

  const today = getTodayDateString();

  const { data: attendance, error: fetchError } = await supabase
    .from('sales_attendance')
    .select('*')
    .eq('salesperson_id', user.id)
    .eq('attendance_date', today)
    .maybeSingle();

  if (fetchError) {
    console.error('Check-out fetch error:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!attendance) {
    return { success: false, error: 'No attendance record found for today. Check in first.' };
  }

  if (!attendance.check_in_time) {
    return { success: false, error: 'Not checked in yet' };
  }

  if (attendance.check_out_time) {
    return { success: false, error: 'Already checked out today' };
  }

  const now = new Date().toISOString();
  const checkInTime = new Date(attendance.check_in_time);
  const checkOutTime = new Date(now);
  const workingMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));

  const { data: updatedAttendance, error: updateError } = await supabase
    .from('sales_attendance')
    .update({
      check_out_time: now,
      working_minutes: workingMinutes,
      status: 'CHECKED_OUT',
      updated_at: now,
    })
    .eq('id', attendance.id)
    .select()
    .single();

  if (updateError) {
    console.error('Check-out update error:', updateError);
    return { success: false, error: updateError.message };
  }

  // Create location audit record
  const { error: locationError } = await supabase
    .from('sales_attendance_locations')
    .insert({
      attendance_id: attendance.id,
      event_type: 'CHECK_OUT',
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      captured_at: now,
    });

  if (locationError) {
    console.error('Check-out location error:', locationError);
  }

  return { success: true, attendance: updatedAttendance as AttendanceRecord };
}

export async function getTodayAttendance(): Promise<GetTodayAttendanceResult> {
  const supabase = createClient();

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (
    !permissions.includes(PERMISSIONS.ATTENDANCE.READ_OWN) &&
    !permissions.includes(PERMISSIONS.ATTENDANCE.READ_TEAM) &&
    !permissions.includes(PERMISSIONS.ATTENDANCE.READ_ALL)
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const today = getTodayDateString();

  const { data, error } = await supabase
    .from('sales_attendance')
    .select('*')
    .eq('salesperson_id', user.id)
    .eq('attendance_date', today)
    .maybeSingle();

  if (error) {
    console.error('Get today attendance error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, attendance: data as AttendanceRecord | null };
}

const VALID_SORT_COLUMNS: (keyof AttendanceRecord)[] = [
  'attendance_date',
  'check_in_time',
  'check_out_time',
  'working_minutes',
  'status',
  'created_at',
  'updated_at',
];

export async function getOwnAttendanceHistory(params: ListAttendanceParams = {}): Promise<ListAttendanceResult> {
  const supabase = createClient();

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (!permissions.includes(PERMISSIONS.ATTENDANCE.READ_OWN)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const {
    page = 0,
    pageSize = 20,
    startDate,
    endDate,
    status,
  } = params;

  const cappedPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = page * cappedPageSize;

  let query = supabase
    .from('sales_attendance')
    .select('*', { count: 'exact' })
    .eq('salesperson_id', user.id);

  if (startDate) query = query.gte('attendance_date', startDate);
  if (endDate) query = query.lte('attendance_date', endDate);
  if (status) query = query.eq('status', status);

  query = query.order('attendance_date', { ascending: false });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Get own attendance history error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    records: (data ?? []) as AttendanceRecord[],
    totalCount: count ?? 0,
  };
}

export async function getTeamAttendance(params: ListAttendanceParams = {}): Promise<ListAttendanceResult> {
  const supabase = createClient();

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  const canReadTeam = permissions.includes(PERMISSIONS.ATTENDANCE.READ_TEAM);
  const canReadAll = permissions.includes(PERMISSIONS.ATTENDANCE.READ_ALL);

  if (!canReadTeam && !canReadAll) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const {
    page = 0,
    pageSize = 20,
    startDate,
    endDate,
    status,
    salespersonId,
  } = params;

  const cappedPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = page * cappedPageSize;

  let query = supabase
    .from('sales_attendance')
    .select('*', { count: 'exact' });

  // If specific salespersonId requested, verify access
  if (salespersonId) {
    if (canReadAll) {
      query = query.eq('salesperson_id', salespersonId);
    } else {
      // Verify the salesperson is in the user's team
      const { data: teamMember } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('user_id', salespersonId)
        .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id)
        .maybeSingle();

      if (!teamMember) {
        return { success: false, error: 'Salesperson not found in your team' };
      }
      query = query.eq('salesperson_id', salespersonId);
    }
  } else if (!canReadAll) {
    // For team read, get all salespeople in the user's team (excluding self)
    const { data: teamMembers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id);

    const teamIds = (teamMembers ?? []).map(m => m.user_id).filter(id => id !== user.id);
    if (teamIds.length === 0) {
      return { success: true, records: [], totalCount: 0 };
    }
    query = query.in('salesperson_id', teamIds);
  }

  if (startDate) query = query.gte('attendance_date', startDate);
  if (endDate) query = query.lte('attendance_date', endDate);
  if (status) query = query.eq('status', status);

  query = query.order('attendance_date', { ascending: false });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Get team attendance error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    records: (data ?? []) as AttendanceRecord[],
    totalCount: count ?? 0,
  };
}
