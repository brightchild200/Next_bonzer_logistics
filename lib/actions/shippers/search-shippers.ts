'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface ShipperSearchResult {
  id: string;
  shipper_ref: string;
  company_name: string;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  source_customer_id: string | null;
}

export interface SearchShippersParams {
  searchText: string;
  limit?: number;
}

export interface SearchShippersResult {
  success: true;
  shippers: ShipperSearchResult[];
}

export interface SearchShippersError {
  success: false;
  error: string;
}

export type SearchShippersResponse = SearchShippersResult | SearchShippersError;

export async function searchShippers(
  params: SearchShippersParams
): Promise<SearchShippersResponse> {
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

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.READ)) {
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