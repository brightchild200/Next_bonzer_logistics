'use server';

import { createClient } from '@/lib/db/server';
import type { Permission } from '@/lib/auth/permissions';

export interface EmployeeDetail {
  id: string;
  full_name: string;
  employee_code: string | null;
  email: string | null;
}

export interface GetEmployeeResult {
  success: true;
  employee: EmployeeDetail;
}

export interface GetEmployeeError {
  success: false;
  error: string;
}

export type GetEmployeeResponse = GetEmployeeResult | GetEmployeeError;

export async function getEmployee(
  employeeId: string
): Promise<GetEmployeeResponse> {
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

  if (!userPermissions.includes('interaction:read_all')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, employee_code, email')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Employee not found' };
  }

  return {
    success: true,
    employee: data as EmployeeDetail,
  };
}