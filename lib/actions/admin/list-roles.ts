'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError || !authContext) {
    return {
      success: false,
      error: 'Failed to resolve auth context',
    };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (
    !userPermissions.includes(PERMISSIONS.ADMIN.USER_READ) &&
    !userPermissions.includes(PERMISSIONS.ADMIN.USER_ASSIGN_ROLES)
  ) {
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