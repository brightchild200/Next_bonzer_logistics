'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Vendor } from '../types';

export type GetVendorResult =
  | {
      success: true;
      vendor: Vendor;
    }
  | {
      success: false;
      error: string;
    };

export async function getVendor(vendorId: string): Promise<GetVendorResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!vendorId?.trim()) {
    return { success: false, error: 'Vendor ID is required' };
  }

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle();

  if (error) {
    console.error('[getVendor] Error:', error);
    return { success: false, error: 'Failed to fetch vendor' };
  }

  if (!data) {
    return { success: false, error: 'Vendor not found' };
  }

  return {
    success: true,
    vendor: data as Vendor,
  };
}