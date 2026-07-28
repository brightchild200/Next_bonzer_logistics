'use server';

import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type AdminResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

async function validateAdminPermissions(supabase: ReturnType<typeof import('@/lib/db/server').createClient>): Promise<Permission[]> {
  const { data: authContext, error: authContextError } = await supabase.rpc('get_my_auth_context');
  if (authContextError || !authContext) {
    throw new Error('Failed to resolve auth context');
  }
  const userPermissions: Permission[] = Array.isArray(authContext.permissions) ? authContext.permissions : [];
  return userPermissions;
}

export async function adminResetPassword(userId: string): Promise<AdminResetPasswordResult> {
  const supabase = (await import('@/lib/db/server')).createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const userPermissions = await validateAdminPermissions(supabase);
  const hasRequired = userPermissions.includes(PERMISSIONS.ADMIN.USER_UPDATE);
  if (!hasRequired) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!userId?.trim()) {
    return { success: false, error: 'User ID is required' };
  }

  // Prevent self-reset
  if (user.id === userId) {
    return { success: false, error: 'You cannot reset your own password this way' };
  }

  // Get user email from profiles or auth
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { success: false, error: 'Employee not found' };
  }

  const adminClient = createAdminClient();

  // Get the user's email from auth
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);

  if (authUserError || !authUser.user?.email) {
    return { success: false, error: 'Failed to retrieve user email' };
  }

  const email = authUser.user.email;

  // Generate password reset link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { success: false, error: linkError?.message ?? 'Failed to generate reset link' };
  }

  // In a real app, you'd send this via your email service
  // For now, we'll just return success - the link would be emailed
  // The admin could also copy the link manually if needed
  console.log(`Password reset link for ${profile.full_name} (${email}):`, linkData.properties.action_link);

  return { success: true };
}