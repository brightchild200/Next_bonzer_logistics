'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type DeleteCustomerResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteCustomer(customerId: string): Promise<DeleteCustomerResult> {
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

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.DEACTIVATE)) {
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
