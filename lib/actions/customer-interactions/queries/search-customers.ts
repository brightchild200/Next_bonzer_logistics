'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { CustomerSearchResult } from '../types';

export interface SearchCustomersResult {
  success: true;
  customers: CustomerSearchResult[];
}

export interface SearchCustomersError {
  success: false;
  error: string;
}

export type SearchCustomersResponse = SearchCustomersResult | SearchCustomersError;

export async function searchCustomers(
  searchText: string,
  limit: number = 20
): Promise<SearchCustomersResponse> {
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

  const cappedLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase.rpc('search_customers', {
    search_text: searchText ?? '',
    limit_count: cappedLimit,
  });

  if (error) {
    console.error('[searchCustomers] RPC error:', error);
    return { success: false, error: 'Failed to search customers' };
  }

  return {
    success: true,
    customers: (data ?? []) as CustomerSearchResult[],
  };
}