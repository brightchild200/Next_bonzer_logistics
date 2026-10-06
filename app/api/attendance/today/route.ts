import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

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

export async function GET() {
  try {
    const supabase = createClient();
    const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
    if (authError || !user) return Response.json({ success: false, error: authError ?? 'Unauthorized' }, { status: 401 });

    if (
      !permissions.includes(PERMISSIONS.ATTENDANCE.READ_OWN) &&
      !permissions.includes(PERMISSIONS.ATTENDANCE.READ_TEAM) &&
      !permissions.includes(PERMISSIONS.ATTENDANCE.READ_ALL)
    ) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const today = getTodayDateString();

    const { data, error } = await supabase
      .from('sales_attendance')
      .select('*')
      .eq('salesperson_id', user.id)
      .eq('attendance_date', today)
      .maybeSingle();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, attendance: data });
  } catch (error) {
    console.error('Get today attendance API error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}