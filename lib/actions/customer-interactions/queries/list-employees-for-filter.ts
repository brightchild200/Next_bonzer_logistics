'use server';

import { unstable_cache } from 'next/cache';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';

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

async function getSalespersonTeamMemberIds(currentUserId: string): Promise<string[]> {
  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

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

async function fetchAllEmployees(): Promise<EmployeeOption[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, employee_code')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[listEmployeesForFilter] Query error:', error);
    throw new Error('Failed to fetch employees');
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    fullName: e.full_name,
    employeeCode: e.employee_code,
  }));
}

const getCachedAllEmployees = unstable_cache(
  fetchAllEmployees,
  ['employees-for-filter'],
  { revalidate: 300, tags: ['employees-for-filter'] }
);

export async function listEmployeesForFilter(): Promise<ListEmployeesForFilterResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  const hasReadAll = hasPermission(authContext, PERMISSIONS.INTERACTION.READ_ALL);
  const hasReadTeam = hasPermission(authContext, PERMISSIONS.INTERACTION.READ_TEAM);
  const hasReadOwn = hasPermission(authContext, PERMISSIONS.INTERACTION.READ_OWN);
  const hasCreate = hasPermission(authContext, PERMISSIONS.INTERACTION.CREATE);

  if (!hasReadAll && !hasReadTeam && !hasReadOwn && !hasCreate) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const allEmployees = await getCachedAllEmployees();

    if (hasReadAll) {
      return { success: true, employees: allEmployees };
    }

    const allowedEmployeeIds = new Set<string>();

    if (hasReadTeam) {
      const teamMemberIds = await getSalespersonTeamMemberIds(authContext.userId);
      teamMemberIds.forEach((id) => allowedEmployeeIds.add(id));
    }

    if (hasReadOwn) {
      allowedEmployeeIds.add(authContext.userId);
    }

    if (allowedEmployeeIds.size === 0) {
      return { success: true, employees: [] };
    }

    const filtered = allEmployees.filter((e) => allowedEmployeeIds.has(e.id));
    return { success: true, employees: filtered };
  } catch {
    return { success: false, error: 'Failed to fetch employees' };
  }
}