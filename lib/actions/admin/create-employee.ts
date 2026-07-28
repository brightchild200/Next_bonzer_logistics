'use server';

import { createClient } from '@/lib/db/server';
import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type CreateEmployeeResult =
  | { success: true; user_id: string }
  | { success: false; error: string };

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

function validatePhone(phone: string | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    return 'Phone number must be 10-15 digits (with optional + prefix)';
  }
  return null;
}

export async function createEmployee(input: {
  full_name: string;
  email: string;
  password: string;
  employee_code?: string;
  phone?: string;
  role_ids: string[];
}): Promise<CreateEmployeeResult> {
  const supabase = createClient();

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
  const requiredPermissions: Permission[] = [PERMISSIONS.ADMIN.USER_CREATE, PERMISSIONS.ADMIN.USER_ASSIGN_ROLES];
  const hasRequired = requiredPermissions.every((p) => userPermissions.includes(p));
  if (!hasRequired) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.full_name?.trim()) {
    return { success: false, error: 'full_name is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email?.trim() || !emailRegex.test(input.email.trim())) {
    return { success: false, error: 'Valid email is required' };
  }

  if (!input.role_ids?.length) {
    return { success: false, error: 'At least one role_id is required' };
  }

  // Validate password
  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { success: false, error: passwordError };
  }

  // Validate phone
  const phoneError = validatePhone(input.phone);
  if (phoneError) {
    return { success: false, error: phoneError };
  }

  const normalizedEmployeeCode = input.employee_code?.trim().toUpperCase() || null;

  // Check for duplicate email in auth.users
  const adminClient = createAdminClient();

  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const emailExists = existingUsers.users.some((u) => u.email?.toLowerCase() === input.email.trim().toLowerCase());
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
    .in('id', input.role_ids)
    .eq('is_active', true);

  if (rolesError) {
    return { success: false, error: 'Failed to validate roles' };
  }

  if (validRoles.length !== input.role_ids.length) {
    return { success: false, error: 'One or more role_ids are invalid or inactive' };
  }

  // Create user with password - email_confirm: true means they're immediately active
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim() },
  });

  if (createError || !userData.user) {
    return { success: false, error: createError?.message ?? 'Failed to create user' };
  }

  const newUserId = userData.user.id;

  try {
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: input.full_name.trim(),
        employee_code: normalizedEmployeeCode,
        phone: input.phone?.trim() ?? null,
        is_active: true,
      });

    if (profileError) {
      throw profileError;
    }

    const userRoles = input.role_ids.map((role_id) => ({
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
    // Rollback: delete the created auth user
    await adminClient.auth.admin.deleteUser(newUserId);
    const message = error instanceof Error ? error.message : 'Failed to create employee profile or assign roles';
    return { success: false, error: message };
  }
}
