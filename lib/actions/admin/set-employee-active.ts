'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export type SetEmployeeActiveResult =
  | { success: true }
  | { success: false; error: string };

export async function setEmployeeActive(
  userId: string,
  isActive: boolean
): Promise<SetEmployeeActiveResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
    };
  }

  const authContext: AuthContext = authResult.authContext;
  const currentUserId = authContext.userId;

  if (!hasPermission(authContext, PERMISSIONS.ADMIN.USER_DEACTIVATE)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  if (!userId?.trim()) {
    return {
      success: false,
      error: 'user_id is required',
    };
  }

  if (currentUserId === userId) {
    return {
      success: false,
      error: 'You cannot change your own active status',
    };
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      error: 'Failed to validate employee',
    };
  }

  if (!targetProfile) {
    return {
      success: false,
      error: 'Employee not found',
    };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    return {
      success: false,
      error: 'Failed to update employee status',
    };
  }

  return {
    success: true,
  };
}