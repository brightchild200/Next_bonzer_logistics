'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type SetEmployeeActiveResult =
  | { success: true }
  | { success: false; error: string };

export async function setEmployeeActive(
  userId: string,
  isActive: boolean
): Promise<SetEmployeeActiveResult> {
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

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError) {
    return {
      success: false,
      error: 'Failed to resolve auth context',
    };
  }

  const userPermissions: Permission[] = Array.isArray(authContext?.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.ADMIN.USER_DEACTIVATE)) {
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

  if (user.id === userId) {
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