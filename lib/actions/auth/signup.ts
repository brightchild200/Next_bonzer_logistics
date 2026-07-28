'use server';

import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type SignupInput = {
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

export type SignupResult =
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

export async function signup(input: SignupInput): Promise<SignupResult> {
  const adminClient = createAdminClient();

  const email = input.email?.trim().toLowerCase();
  const fullName = input.full_name?.trim();
  const companyName = input.company_name?.trim();
  const phone = input.phone?.trim() || null;
  const password = input.password;

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

  if (!companyName) {
    return { success: false, error: 'Company name is required' };
  }

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { success: false, error: passwordError };
  }

  // Check if user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const userExists = existingUsers.users.some((u) => u.email?.toLowerCase() === email);
  if (userExists) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Determine role: first user gets admin, others get salesperson
  const { count: profileCount } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const isFirstUser = (profileCount ?? 0) === 0;
  const roleName = isFirstUser ? 'admin' : 'salesperson';

  const { data: roleData, error: roleError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .eq('is_active', true)
    .maybeSingle();

  if (roleError || !roleData) {
    return { success: false, error: `Failed to find ${roleName} role` };
  }

  const roleId = roleData.id;

  // Create auth user
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_name: companyName,
      mobile: phone,
    },
  });

  if (createError || !userData.user) {
    return { success: false, error: createError?.message ?? 'Failed to create user' };
  }

  const newUserId = userData.user.id;

  try {
    // Create profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        phone,
        is_active: true,
      });

    if (profileError) {
      throw profileError;
    }

    // Assign role
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role_id: roleId,
        assigned_by: newUserId, // self-assigned for first user
      });

    if (roleInsertError) {
      throw roleInsertError;
    }

    return { success: true, user_id: newUserId };
  } catch (error) {
    // Rollback: delete the created auth user
    await adminClient.auth.admin.deleteUser(newUserId);
    const message = error instanceof Error ? error.message : 'Failed to create profile or assign role';
    return { success: false, error: message };
  }
}