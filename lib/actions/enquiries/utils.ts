import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export function normalizeEnquiryStatusInput(status: string) {
  return status.trim().toLowerCase();
}

export function hasPermission(
  permissions: Permission[],
  required: Permission
): boolean {
  return permissions.includes(required);
}

export function isCustomerServiceStatus(status: string) {
  return ['quoted', 'won', 'lost', 'archived'].includes(status);
}

export function canAssignEnquiry(permissions: Permission[]) {
  return (
    permissions.includes(PERMISSIONS.ENQUIRY.ASSIGN) ||
    permissions.includes(PERMISSIONS.ADMIN.USER_UPDATE)
  );
}
