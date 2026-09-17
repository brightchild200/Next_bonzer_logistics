import { cache } from 'react';
import { createClient } from '@/lib/db/server';
import type { Permission } from '@/lib/auth/permissions';

export interface AuthContext {
  userId: string;
  profile: {
    id: string;
    fullName: string;
    employeeCode: string | null;
    phone: string | null;
    isActive: boolean;
  } | null;
  roles: string[];
  permissions: Permission[];
}

export interface AuthContextResult {
  success: true;
  authContext: AuthContext;
}

export interface AuthContextError {
  success: false;
  error: string;
}

export type AuthContextResponse = AuthContextResult | AuthContextError;

async function getAuthContextUncached(): Promise<AuthContextResponse> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc(
    'get_my_auth_context'
  );

  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  const result: AuthContext = {
    userId: user.id,
    profile: authContext.profile
      ? {
          id: authContext.profile.id,
          fullName: authContext.profile.full_name,
          employeeCode: authContext.profile.employee_code,
          phone: authContext.profile.phone,
          isActive: authContext.profile.is_active,
        }
      : null,
    roles: Array.isArray(authContext.roles) ? authContext.roles : [],
    permissions: userPermissions,
  };

  return { success: true, authContext: result };
}

export const getAuthContext = cache(getAuthContextUncached);

export function hasPermission(
  authContext: AuthContext,
  permission: Permission | Permission[]
): boolean {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.some((p) => authContext.permissions.includes(p));
}

export function hasRole(authContext: AuthContext, role: string): boolean {
  return authContext.roles.includes(role);
}

export function clearAuthContextCache(_userId?: string): void {
  // No-op: React.cache() provides request-scoped memoization.
  // Cache is automatically cleared at the end of each request.
}