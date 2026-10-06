'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Consignee } from './types';

export interface GetConsigneeResult {
  success: true;
  consignee: Consignee;
}

export interface GetConsigneeError {
  success: false;
  error: string;
}

export type GetConsigneeResponse = GetConsigneeResult | GetConsigneeError;

export async function getConsignee(consigneeId: string): Promise<GetConsigneeResponse> {
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
    .from('consignees')
    .select(
      `
      id,
      consignee_ref,
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
    .eq('id', consigneeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Consignee not found' };
    }
    console.error('[getConsignee] Query error:', error);
    return { success: false, error: 'Failed to fetch consignee' };
  }

  return {
    success: true,
    consignee: data as Consignee,
  };
}