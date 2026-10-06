'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export type DeleteConsigneeResult =
  | {
      success: true;
      consignee_ref: string;
    }
  | {
      success: false;
      error: string;
    };

export async function deleteConsignee(consigneeId: string): Promise<DeleteConsigneeResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.DEACTIVATE)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const { data: existingConsignee, error: existingConsigneeError } =
    await supabase
      .from('consignees')
      .select('id, consignee_ref')
      .eq('id', consigneeId)
      .maybeSingle();

  if (existingConsigneeError) {
    console.error('Existing consignee lookup error:', existingConsigneeError);
    return {
      success: false,
      error: 'Failed to validate consignee',
    };
  }

  if (!existingConsignee) {
    return {
      success: false,
      error: 'Consignee not found',
    };
  }

  const { error } = await supabase
    .from('consignees')
    .update({ is_active: false })
    .eq('id', consigneeId);

  if (error) {
    console.error('Delete consignee error:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    consignee_ref: existingConsignee.consignee_ref,
  };
}
