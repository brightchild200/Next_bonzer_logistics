'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface CompanyNameResult {
  id: string;
  customer_ref: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  gst_number: string | null;
  pan_number: string | null;
}

export interface SearchCompanyNamesResponse {
  success: true;
  companies: CompanyNameResult[];
}

export interface SearchCompanyNamesError {
  success: false;
  error: string;
}

export type SearchCompanyNamesResult = SearchCompanyNamesResponse | SearchCompanyNamesError;

export async function searchCompanyNames(
  searchText: string,
  limit: number = 10
): Promise<SearchCompanyNamesResult> {
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

  const trimmed = searchText.trim();
  if (trimmed.length < 2) {
    return { success: true, companies: [] };
  }

  const cappedLimit = Math.min(Math.max(limit, 1), 50);

  const { data, error } = await supabase
    .from('customers')
    .select(
      `
      id,
      customer_ref,
      company_name,
      contact_person,
      email,
      phone,
      city,
      state,
      gst_number,
      pan_number
    `
    )
    .eq('is_active', true)
    .ilike('company_name', `${trimmed}%`)
    .order('company_name')
    .limit(cappedLimit);

  if (error) {
    console.error('[searchCompanyNames] Query error:', error);
    return { success: false, error: 'Failed to search company names' };
  }

  return {
    success: true,
    companies: (data ?? []) as CompanyNameResult[],
  };
}