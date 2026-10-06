import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

function validateLatitude(lat: number): string | null {
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
  return null;
}

function validateLongitude(lng: number): string | null {
  if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
  return null;
}

function validateAccuracy(acc?: number): string | null {
  if (acc !== undefined && acc < 0) return 'Accuracy must be non-negative';
  return null;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function getUserAndPermissions(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, permissions: [] as Permission[], error: 'Unauthorized' };

  const { data: authContext, error: authContextError } = await supabase.rpc('get_my_auth_context');
  if (authContextError || !authContext) return { user, permissions: [] as Permission[], error: 'Failed to resolve auth context' };

  const userPermissions: Permission[] = Array.isArray(authContext.permissions) ? authContext.permissions : [];
  return { user, permissions: userPermissions, error: null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, accuracy } = body;

    const latError = validateLatitude(latitude);
    if (latError) return Response.json({ success: false, error: latError }, { status: 400 });

    const lngError = validateLongitude(longitude);
    if (lngError) return Response.json({ success: false, error: lngError }, { status: 400 });

    const accError = validateAccuracy(accuracy);
    if (accError) return Response.json({ success: false, error: accError }, { status: 400 });

    const supabase = createClient();
    const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
    if (authError || !user) return Response.json({ success: false, error: authError ?? 'Unauthorized' }, { status: 401 });

    if (!permissions.includes(PERMISSIONS.ATTENDANCE.CHECK_IN)) {
      return Response.json({ success: false, error: 'Insufficient permissions to check in' }, { status: 403 });
    }

    const today = getTodayDateString();
    const now = new Date().toISOString();

    const { data: existingAttendance } = await supabase
      .from('sales_attendance')
      .select('id, status, check_in_time')
      .eq('salesperson_id', user.id)
      .eq('attendance_date', today)
      .maybeSingle();

    if (existingAttendance) {
      if (existingAttendance.status === 'CHECKED_IN' || existingAttendance.check_in_time) {
        return Response.json({ success: false, error: 'Already checked in today' }, { status: 400 });
      }
    }

    let attendanceId: string;
    let attendance: Record<string, unknown>;

    if (existingAttendance) {
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

      if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
      attendanceId = data.id;
      attendance = data;
    } else {
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

      if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
      attendanceId = data.id;
      attendance = data;
    }

    const { error: locationError } = await supabase
      .from('sales_attendance_locations')
      .insert({
        attendance_id: attendanceId,
        event_type: 'CHECK_IN',
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        captured_at: now,
      });

    if (locationError) {
      console.error('Check-in location error:', locationError);
    }

    return Response.json({ success: true, attendance });
  } catch (error) {
    console.error('Check-in API error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}