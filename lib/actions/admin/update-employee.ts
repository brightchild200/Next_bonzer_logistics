'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export interface UpdateEmployeeInput {
  user_id: string;
  full_name: string;
  employee_code?: string;
  phone?: string;
  role_ids: string[];
}

export type UpdateEmployeeResult =
  | { success: true }
  | { success: false; error: string };

export async function updateEmployee(
  input: UpdateEmployeeInput
): Promise<UpdateEmployeeResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
    };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, [PERMISSIONS.ADMIN.USER_UPDATE, PERMISSIONS.ADMIN.USER_ASSIGN_ROLES])) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const roleIds = Array.from(new Set(input.role_ids ?? []));

  if (!input.user_id?.trim()) {
    return {
      success: false,
      error: 'user_id is required',
    };
  }

  if (!input.full_name?.trim()) {
    return {
      success: false,
      error: 'full_name is required',
    };
  }

  if (!roleIds.length) {
    return {
      success: false,
      error: 'At least one role is required',
    };
  }

  const { error } = await supabase.rpc('update_employee', {
    target_user_id: input.user_id,
    new_full_name: input.full_name.trim(),
    new_employee_code: input.employee_code?.trim().toUpperCase() ?? '',
    new_phone: input.phone?.trim() ?? '',
    new_role_ids: roleIds,
  });

  if (error) {
    console.error('Update employee error:', error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}
