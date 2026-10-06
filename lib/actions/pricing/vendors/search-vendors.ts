'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  SearchVendorsParams,
  SearchVendorsResponse,
  SearchVendorsResult,
  SearchVendorsError,
  VendorSearchResult,
} from '../types';

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

export async function searchVendors(params: SearchVendorsParams): Promise<SearchVendorsResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const searchText = params.searchText?.trim();
  if (!searchText) {
    return { success: false, error: 'Search text is required' };
  }

  const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, params.limit ?? DEFAULT_SEARCH_LIMIT));

  const { data, error } = await supabase
    .from('vendors')
    .select('id, vendor_ref, company_name, contact_person, city, country')
    .or(
      `company_name.ilike.%${searchText}%,vendor_ref.ilike.%${searchText}%,contact_person.ilike.%${searchText}%,city.ilike.%${searchText}%`
    )
    .eq('is_active', true)
    .order('company_name')
    .limit(limit);

  if (error) {
    console.error('[searchVendors] Error:', error);
    return { success: false, error: 'Failed to search vendors' };
  }

  return {
    success: true,
    vendors: (data ?? []) as VendorSearchResult[],
  };
}