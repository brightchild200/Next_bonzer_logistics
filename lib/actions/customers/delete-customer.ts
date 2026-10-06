'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export type DeleteCustomerResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteCustomer(customerId: string): Promise<DeleteCustomerResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.DEACTIVATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
