'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';

export interface PolSearchResult {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  country_id: string;
  country_name: string;
  country_iso_code: string;
  unlocode: string | null;
}

export interface SearchPolsParams {
  searchText: string;
  limit?: number;
}

export interface SearchPolsResult {
  success: true;
  pols: PolSearchResult[];
}

export interface SearchPolsError {
  success: false;
  error: string;
}

export type SearchPolsResponse = SearchPolsResult | SearchPolsError;

export async function searchPols(
  params: SearchPolsParams
): Promise<SearchPolsResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.ENQUIRY.CREATE) &&
      !hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ASSIGNED) &&
      !hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_TEAM) &&
      !hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ALL) &&
      !hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_OWN)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const trimmed = params.searchText.trim();
  if (trimmed.length < 2) {
    return { success: true, pols: [] };
  }

  const cappedLimit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const { data, error } = await supabase
    .from('port_master')
    .select(
      `
      id,
      name,
      unlocode,
      city,
      state,
      country_id,
      countries(name, iso_code),
      location_type
      `
    )
    .eq('is_active', true)
    .eq('location_type', 'SEA')
    .or(
      `name.ilike.%${trimmed}%,` +
      `unlocode.ilike.%${trimmed}%,` +
      `city.ilike.%${trimmed}%`
    )
    .order('name')
    .limit(cappedLimit);

  if (error) {
    console.error('[searchPols] Query error:', error);
    return { success: false, error: 'Failed to search POLs' };
  }

  return {
    success: true,
    pols: (data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      code: row.unlocode,
      city: row.city,
      state: row.state,
      country_id: row.country_id,
      country_name: (row.countries as any)?.[0]?.name ?? '',
      country_iso_code: (row.countries as any)?.[0]?.iso_code ?? '',
      unlocode: row.unlocode,
    })) as PolSearchResult[],
  };
}