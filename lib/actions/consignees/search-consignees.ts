'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export interface ConsigneeSearchResult {
  id: string;
  consignee_ref: string;
  company_name: string;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  source_customer_id: string | null;
}

export interface SearchConsigneesParams {
  searchText: string;
  limit?: number;
}

export interface SearchConsigneesResult {
  success: true;
  consignees: ConsigneeSearchResult[];
}

export interface SearchConsigneesError {
  success: false;
  error: string;
}

export type SearchConsigneesResponse = SearchConsigneesResult | SearchConsigneesError;

export async function searchConsignees(
  params: SearchConsigneesParams
): Promise<SearchConsigneesResponse> {
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
    return { success: true, consignees: [] };
  }

  const cappedLimit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const { data, error } = await supabase
    .from('consignees')
    .select(
      `
      id,
      consignee_ref,
      company_name,
      contact_person,
      city,
      country,
      source_customer_id
      `
    )
    .or(
      `company_name.ilike.%${trimmed}%,` +
      `consignee_ref.ilike.%${trimmed}%,` +
      `contact_person.ilike.%${trimmed}%`
    )
    .order('company_name')
    .limit(cappedLimit);

  if (error) {
    console.error('[searchConsignees] Query error:', error);
    return { success: false, error: 'Failed to search consignees' };
  }

  return {
    success: true,
    consignees: (data ?? []) as ConsigneeSearchResult[],
  };
}