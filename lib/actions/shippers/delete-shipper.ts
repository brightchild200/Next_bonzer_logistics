'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export type DeleteShipperResult =
  | {
      success: true;
      shipper_ref: string;
    }
  | {
      success: false;
      error: string;
    };

export async function deleteShipper(shipperId: string): Promise<DeleteShipperResult> {
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

  const { data: existingShipper, error: existingShipperError } =
    await supabase
      .from('shippers')
      .select('id, shipper_ref')
      .eq('id', shipperId)
      .maybeSingle();

  if (existingShipperError) {
    console.error('Existing shipper lookup error:', existingShipperError);
    return {
      success: false,
      error: 'Failed to validate shipper',
    };
  }

  if (!existingShipper) {
    return {
      success: false,
      error: 'Shipper not found',
    };
  }

  const { error } = await supabase
    .from('shippers')
    .update({ is_active: false })
    .eq('id', shipperId);

  if (error) {
    console.error('Delete shipper error:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    shipper_ref: existingShipper.shipper_ref,
  };
}
