'use server';

import { createClient } from '@/lib/db/server';
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

  const canReadInteraction =
    userPermissions.includes('interaction:read_all') ||
    userPermissions.includes('interaction:read_own') ||
    userPermissions.includes('interaction:create');

  if (!canReadInteraction) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, employee_code')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

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