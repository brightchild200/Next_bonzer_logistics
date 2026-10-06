'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { VendorQuote } from '../types';

export type GetVendorQuoteResult =
  | {
      success: true;
      vendorQuote: VendorQuote;
    }
  | {
      success: false;
      error: string;
    };

export async function getVendorQuote(vendorQuoteId: string): Promise<GetVendorQuoteResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!vendorQuoteId?.trim()) {
    return { success: false, error: 'Vendor Quote ID is required' };
  }

  const { data, error } = await supabase
    .from('vendor_quotes')
    .select(
      `
      *,
      vendor:vendors!left (
        id,
        vendor_ref,
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
        is_active
      )
    `
    )
    .eq('id', vendorQuoteId)
    .maybeSingle();

  if (error) {
    console.error('[getVendorQuote] Error:', error);
    return { success: false, error: 'Failed to fetch vendor quote' };
  }

  if (!data) {
    return { success: false, error: 'Vendor quote not found' };
  }

  return {
    success: true,
    vendorQuote: data as VendorQuote,
  };
}