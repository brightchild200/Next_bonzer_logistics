import type { Permission, Role } from './permissions';
import { ROLES, PERMISSIONS, ALL_PERMISSIONS } from './permissions';

/**
 * Checks if a permission is present in the permissions array.
 */
export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes(required);
}

/**
 * Checks if any of the required permissions are present.
 */
export function hasAnyPermission(permissions: Permission[], required: Permission[]): boolean {
  return required.some((p) => permissions.includes(p));
}

/**
 * Checks if all required permissions are present.
 */
export function hasAllPermissions(permissions: Permission[], required: Permission[]): boolean {
  return required.every((p) => permissions.includes(p));
}

/**
 * Checks if a role is present in the roles array.
 */
export function hasRole(roles: Role[], required: Role): boolean {
  return roles.includes(required);
}

/**
 * Checks if any of the required roles are present.
 */
export function hasAnyRole(roles: Role[], required: Role[]): boolean {
  return required.some((r) => roles.includes(r));
}

/**
 * Computes the combined permissions for a set of roles.
 * Used for server-side permission derivation or testing.
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const rolePermissions: Record<Role, Permission[]> = {
    [ROLES.ADMIN]: ALL_PERMISSIONS,
    [ROLES.SALES_MANAGER]: [
      PERMISSIONS.CUSTOMER.CREATE,
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.CUSTOMER.UPDATE,
      PERMISSIONS.CUSTOMER.DEACTIVATE,
      PERMISSIONS.ENQUIRY.CREATE,
      PERMISSIONS.ENQUIRY.READ,
      PERMISSIONS.ENQUIRY.UPDATE,
      PERMISSIONS.ENQUIRY.ASSIGN,
      PERMISSIONS.ENQUIRY.CONVERT,
      PERMISSIONS.PRICING.READ,
      PERMISSIONS.PRICING.UPDATE,
      PERMISSIONS.JOB.CREATE,
      PERMISSIONS.JOB.READ,
      PERMISSIONS.JOB.UPDATE,
    ],
    [ROLES.SALESPERSON]: [
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.ENQUIRY.CREATE,
      PERMISSIONS.ENQUIRY.READ,
      PERMISSIONS.ENQUIRY.UPDATE,
      PERMISSIONS.JOB.READ,
    ],
    [ROLES.CUSTOMER_SERVICE]: [
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.CUSTOMER.UPDATE,
      PERMISSIONS.ENQUIRY.READ,
      PERMISSIONS.ENQUIRY.UPDATE,
      PERMISSIONS.ENQUIRY.ASSIGN,
      PERMISSIONS.JOB.READ,
      PERMISSIONS.JOB.UPDATE,
    ],
    [ROLES.PRICING]: [
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.PRICING.READ,
      PERMISSIONS.PRICING.UPDATE,
    ],
    [ROLES.OPERATIONS]: [
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.ENQUIRY.READ,
      PERMISSIONS.JOB.CREATE,
      PERMISSIONS.JOB.READ,
      PERMISSIONS.JOB.UPDATE,
    ],
    [ROLES.ACCOUNTS]: [
      PERMISSIONS.CUSTOMER.READ,
      PERMISSIONS.ENQUIRY.READ,
      PERMISSIONS.JOB.READ,
      PERMISSIONS.PRICING.READ,
    ],
  };

  const perms = new Set<Permission>();
  for (const role of roles) {
    for (const perm of rolePermissions[role] ?? []) {
      perms.add(perm);
    }
  }
  return Array.from(perms);
}