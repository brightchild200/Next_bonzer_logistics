'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { SearchShippersParams, SearchShippersResponse, ShipperSearchResult } from './types';

export type { ShipperSearchResult } from './types';

export async function searchShippers(
  params: SearchShippersParams
): Promise<SearchShippersResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const trimmed = params.searchText.trim();
  if (trimmed.length < 2) {
    return { success: true, shippers: [] };
  }

  const cappedLimit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const { data, error } = await supabase
    .from('shippers')
    .select(
      `
      id,
      shipper_ref,
      company_name,
      contact_person,
      city,
      country,
      source_customer_id
      `
    )
    .or(
      `company_name.ilike.%${trimmed}%,` +
      `shipper_ref.ilike.%${trimmed}%,` +
      `contact_person.ilike.%${trimmed}%`
    )
    .order('company_name')
    .limit(cappedLimit);

  if (error) {
    console.error('[searchShippers] Query error:', error);
    return { success: false, error: 'Failed to search shippers' };
  }

  return {
    success: true,
    shippers: (data ?? []) as ShipperSearchResult[],
  };
}
