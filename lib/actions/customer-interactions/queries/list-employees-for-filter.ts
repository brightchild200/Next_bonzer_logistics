'use server';

import { createClient } from '@/lib/db/server';
import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface EmployeeOption {
  id: string;
  fullName: string;
  employeeCode: string | null;
}

export interface ListEmployeesForFilterResult {
  success: true;
  employees: EmployeeOption[];
}

export interface ListEmployeesForFilterError {
  success: false;
  error: string;
}

export type ListEmployeesForFilterResponse = ListEmployeesForFilterResult | ListEmployeesForFilterError;

async function getSalespersonTeamMemberIds(supabase: ReturnType<typeof createClient>, currentUserId: string): Promise<string[]> {
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'salesperson')
    .single();

  if (!roleData) {
    return [];
  }

  const { data: teamMembers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', roleData.id);

  return (teamMembers ?? []).map(m => m.user_id).filter(id => id !== currentUserId);
}

export async function listEmployeesForFilter(): Promise<ListEmployeesForFilterResponse> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc(
    'get_my_auth_context'
  );

  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  const hasReadAll = userPermissions.includes(PERMISSIONS.INTERACTION.READ_ALL);
  const hasReadTeam = userPermissions.includes(PERMISSIONS.INTERACTION.READ_TEAM);
  const hasReadOwn = userPermissions.includes(PERMISSIONS.INTERACTION.READ_OWN);

  if (!hasReadAll && !hasReadTeam && !hasReadOwn && !userPermissions.includes(PERMISSIONS.INTERACTION.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const adminClient = createAdminClient();

  let query = adminClient
    .from('profiles')
    .select('id, full_name, employee_code')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (!hasReadAll) {
    const allowedEmployeeIds = new Set<string>();

    if (hasReadTeam) {
      const teamMemberIds = await getSalespersonTeamMemberIds(supabase, user.id);
      teamMemberIds.forEach((id) => allowedEmployeeIds.add(id));
    }

    if (hasReadOwn) {
      allowedEmployeeIds.add(user.id);
    }

    if (allowedEmployeeIds.size === 0) {
      return { success: true, employees: [] };
    }

    query = query.in('id', Array.from(allowedEmployeeIds));
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listEmployeesForFilter] Query error:', error);
    return { success: false, error: 'Failed to fetch employees' };
  }

  return {
    success: true,
    employees: (data ?? []).map((e) => ({
      id: e.id,
      fullName: e.full_name,
      employeeCode: e.employee_code,
    })),
  };
}