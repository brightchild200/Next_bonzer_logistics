'use server';

import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type AdminResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function adminResetPassword(userId: string): Promise<AdminResetPasswordResult> {
  const supabase = (await import('@/lib/db/server')).createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc('get_my_auth_context');
  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];
  const requiredPermissions: Permission[] = [PERMISSIONS.ADMIN.USER_UPDATE];
  const hasRequired = requiredPermissions.every((p) => userPermissions.includes(p));
  if (!hasRequired) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!userId?.trim()) {
    return { success: false, error: 'user_id is required' };
  }

  if (user.id === userId) {
    return { success: false, error: 'You cannot reset your own password' };
  }

  const adminClient = createAdminClient();

  // Verify the target user exists
  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: 'Failed to validate employee' };
  }

  if (!targetProfile) {
    return { success: false, error: 'Employee not found' };
  }

  // Get the user's email from auth
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);

  if (authUserError || !authUser.user?.email) {
    return { success: false, error: 'Employee email not found' };
  }

  const email = authUser.user.email;

  // Generate password reset link
  const { error: resetError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (resetError) {
    return { success: false, error: resetError.message };
  }

  return { success: true };
}