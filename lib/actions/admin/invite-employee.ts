'use server';

import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type InviteEmployeeInput = {
  email: string;
  full_name: string;
  employee_code?: string;
  phone?: string;
  role_ids: string[];
};

export type InviteEmployeeResult =
  | { success: true; user_id: string }
  | { success: false; error: string };

function validatePhone(phone: string | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    return 'Phone number must be 10-15 digits (with optional + prefix)';
  }
  return null;
}

async function validatePermissions(supabase: ReturnType<typeof import('@/lib/db/server').createClient>): Promise<Permission[]> {
  const { data: authContext, error: authContextError } = await supabase.rpc('get_my_auth_context');
  if (authContextError || !authContext) {
    throw new Error('Failed to resolve auth context');
  }
  const userPermissions: Permission[] = Array.isArray(authContext.permissions) ? authContext.permissions : [];
  return userPermissions;
}

export async function inviteEmployee(input: InviteEmployeeInput): Promise<InviteEmployeeResult> {
  const supabase = (await import('@/lib/db/server')).createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const userPermissions = await validatePermissions(supabase);
  const requiredPermissions: Permission[] = [PERMISSIONS.ADMIN.USER_CREATE, PERMISSIONS.ADMIN.USER_ASSIGN_ROLES];
  const hasRequired = requiredPermissions.every((p) => userPermissions.includes(p));
  if (!hasRequired) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const email = input.email?.trim().toLowerCase();
  const fullName = input.full_name?.trim();
  const phone = input.phone?.trim() || null;
  const roleIds = Array.from(new Set(input.role_ids ?? []));

  if (!email) {
    return { success: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Valid email is required' };
  }
  if (!fullName) {
    return { success: false, error: 'Full name is required' };
  }
  if (!roleIds.length) {
    return { success: false, error: 'At least one role is required' };
  }

  // Validate phone
  const phoneError = validatePhone(phone);
  if (phoneError) {
    return { success: false, error: phoneError };
  }

  const normalizedEmployeeCode = input.employee_code?.trim().toUpperCase() || null;

  // Check for duplicate email in auth.users
  const adminClient = createAdminClient();
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const emailExists = existingUsers.users.some((u) => u.email?.toLowerCase() === email);
  if (emailExists) {
    return { success: false, error: 'An account with this email already exists' };
  }

  if (normalizedEmployeeCode) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_code', normalizedEmployeeCode)
      .maybeSingle();
    if (existingProfile) {
      return { success: false, error: 'employee_code already exists' };
    }
  }

  const { data: validRoles, error: rolesError } = await supabase
    .from('roles')
    .select('id')
    .in('id', roleIds)
    .eq('is_active', true);

  if (rolesError) {
    return { success: false, error: 'Failed to validate roles' };
  }
  if (validRoles.length !== roleIds.length) {
    return { success: false, error: 'One or more role_ids are invalid or inactive' };
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password`,
    data: { full_name: fullName },
  });

  if (inviteError || !inviteData.user) {
    return { success: false, error: inviteError?.message ?? 'Failed to send invitation' };
  }

  const newUserId = inviteData.user.id;

  try {
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        employee_code: normalizedEmployeeCode,
        phone,
        is_active: true,
      });

    if (profileError) {
      throw profileError;
    }

    const userRoles = roleIds.map((role_id) => ({
      user_id: newUserId,
      role_id,
      assigned_by: user.id,
    }));

    const { error: rolesInsertError } = await adminClient
      .from('user_roles')
      .insert(userRoles);

    if (rolesInsertError) {
      throw rolesInsertError;
    }

    return { success: true, user_id: newUserId };
  } catch (error) {
    await adminClient.auth.admin.deleteUser(newUserId);
    const message = error instanceof Error ? error.message : 'Failed to create employee profile or assign roles';
    return { success: false, error: message };
  }
}