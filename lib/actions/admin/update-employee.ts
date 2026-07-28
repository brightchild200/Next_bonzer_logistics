'use server';

import { createClient } from '@/lib/db/server';

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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Unauthorized',
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
