'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  VendorQuote,
  ListVendorQuotesParams,
  ListVendorQuotesResponse,
  ListVendorQuotesResult,
  ListVendorQuotesError,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function listVendorQuotes(params: ListVendorQuotesParams): Promise<ListVendorQuotesResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!params.quotationId?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
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
    `,
      { count: 'exact' }
    )
    .eq('quotation_id', params.quotationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('[listVendorQuotes] Error:', error);
    return { success: false, error: 'Failed to fetch vendor quotes' };
  }

  return {
    success: true,
    vendorQuotes: (data ?? []) as VendorQuote[],
    totalCount: count ?? 0,
    limit: pageSize,
    offset,
  };
}