'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/db/admin';

export interface RoleOption {
  id: string;
  name: string;
  display_name: string;
}

export type ListRolesResult =
  | { success: true; roles: RoleOption[] }
  | { success: false; error: string };

export async function listRoles(): Promise<ListRolesResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, [PERMISSIONS.ADMIN.USER_READ, PERMISSIONS.ADMIN.USER_ASSIGN_ROLES])) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const adminClient = createAdminClient();

  const { data: roles, error } = await adminClient
    .from('roles')
    .select('id, name, display_name')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    return {
      success: false,
      error: `Failed to fetch roles: ${error.message}`,
    };
  }

  return {
    success: true,
    roles: roles ?? [],
  };
}