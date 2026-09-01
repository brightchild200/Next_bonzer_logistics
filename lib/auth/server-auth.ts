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

const authContextCache = new Map<string, AuthContext>();

function getCacheKey(userId: string): string {
  return `auth-context:${userId}`;
}

export async function getAuthContext(): Promise<AuthContextResponse> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const cacheKey = getCacheKey(user.id);
  const cached = authContextCache.get(cacheKey);
  if (cached) {
    return { success: true, authContext: cached };
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

  authContextCache.set(cacheKey, result);
  return { success: true, authContext: result };
}

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

export function clearAuthContextCache(userId?: string): void {
  if (userId) {
    authContextCache.delete(getCacheKey(userId));
  } else {
    authContextCache.clear();
  }
}