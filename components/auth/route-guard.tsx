'use client';

import { ReactNode } from 'react';
import type { Permission } from '@/lib/auth/permissions';
import { usePermissions } from '@/hooks/use-permissions';

interface AccessDeniedProps {
  /** Custom message to display */
  message?: string;
}

/**
 * Default access denied page shown by RouteGuard when no custom fallback is provided.
 */
function AccessDenied({ message = 'You do not have permission to access this page.' }: AccessDeniedProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface RouteGuardProps {
  /** Single permission required to access the page */
  permission?: Permission;
  /** Multiple permissions required to access the page */
  permissions?: Permission[];
  /** How to evaluate multiple permissions: 'any' (default) or 'all' */
  require?: 'any' | 'all';
  /** Custom fallback component/page. Defaults to AccessDenied. */
  fallback?: ReactNode;
  /** Page content to protect */
  children: ReactNode;
}

/**
 * Page-level wrapper that shows an Access Denied page (no redirect) when permissions are missing.
 * Use for entire pages/routes that require authorization.
 *
 * @example
 * <RouteGuard permission={PERMISSIONS.ADMIN.USER_READ}>
 *   <AdminUsersPage />
 * </RouteGuard>
 *
 * @example
 * <RouteGuard permissions={[PERMISSIONS.JOB.CREATE, PERMISSIONS.JOB.READ]} require="all">
 *   <JobManagementPage />
 * </RouteGuard>
 */
export function RouteGuard({
  permission,
  permissions,
  require = 'any',
  fallback,
  children,
}: RouteGuardProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = require === 'all' ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}