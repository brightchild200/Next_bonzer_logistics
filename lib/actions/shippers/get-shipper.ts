'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Shipper } from './types';

export interface GetShipperResult {
  success: true;
  shipper: Shipper;
}

export interface GetShipperError {
  success: false;
  error: string;
}

export type GetShipperResponse = GetShipperResult | GetShipperError;

export async function getShipper(shipperId: string): Promise<GetShipperResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('shippers')
    .select(
      `
      id,
      shipper_ref,
      source_customer_id,
      company_name,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      gst_number,
      pan_number,
      is_active,
      created_by,
      created_at,
      updated_at
      `
    )
    .eq('id', shipperId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Shipper not found' };
    }
    console.error('[getShipper] Query error:', error);
    return { success: false, error: 'Failed to fetch shipper' };
  }

  return {
    success: true,
    shipper: data as Shipper,
  };
}