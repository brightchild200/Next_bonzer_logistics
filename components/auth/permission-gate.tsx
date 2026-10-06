'use client';

import { ReactNode } from 'react';
import type { Permission } from '@/lib/auth/permissions';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** How to evaluate multiple permissions: 'any' (default) or 'all' */
  require?: 'any' | 'all';
  /** Fallback UI when access is denied */
  fallback?: ReactNode;
  /** Content to render when access is granted */
  children: ReactNode;
}

/**
 * Conditionally renders children based on permission checks.
 * Supports single permission, multiple permissions with 'any'/'all' logic, and custom fallback.
 *
 * @example
 * <PermissionGate permission={PERMISSIONS.CUSTOMER.CREATE}>
 *   <CreateButton />
 * </PermissionGate>
 *
 * @example
 * <PermissionGate permissions={[PERMISSIONS.ENQUIRY.READ_TEAM, PERMISSIONS.ENQUIRY.CREATE]} require="all">
 *   <EnquiryPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  require = 'any',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = require === 'all' ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
