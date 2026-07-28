'use client';

import { useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import type { Permission, Role } from '@/lib/auth/permissions';
import {
  hasAnyPermission,
  hasAllPermissions,
  hasAnyRole,
} from '@/lib/auth/permission-utils';

/**
 * React hook for permission checks.
 * Consumes AuthProvider context (which is strongly typed) and returns a generic permission API.
 * No type casts needed — AuthProvider owns the single boundary cast.
 * Does NOT hardcode role-specific booleans (e.g., isAdmin).
 */
export function usePermissions() {
  const { roles, permissions, hasRole: hasRoleAuth, can: canAuth } = useAuth();

  const can = useCallback(
    (permission: Permission): boolean => canAuth(permission),
    [canAuth]
  );

  const canAny = useCallback(
    (requiredPermissions: Permission[]): boolean =>
      hasAnyPermission(permissions, requiredPermissions),
    [permissions]
  );

  const canAll = useCallback(
    (requiredPermissions: Permission[]): boolean =>
      hasAllPermissions(permissions, requiredPermissions),
    [permissions]
  );

  const hasRole = useCallback(
    (role: Role): boolean => hasRoleAuth(role),
    [hasRoleAuth]
  );

  const hasAnyOfRole = useCallback(
    (requiredRoles: Role[]): boolean => hasAnyRole(roles, requiredRoles),
    [roles]
  );

  return {
    roles,
    permissions,
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole: hasAnyOfRole,
  };
}
