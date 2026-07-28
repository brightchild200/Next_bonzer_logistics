'use server';

import { createClient } from '@/lib/db/server';
import type { Permission } from '@/lib/auth/permissions';

export interface CustomerOption {
  id: string;
  customerRef: string;
  companyName: string;
  city: string | null;
  state: string | null;
}

export interface ListCustomersForFilterResult {
  success: true;
  customers: CustomerOption[];
}

export interface ListCustomersForFilterError {
  success: false;
  error: string;
}

export type ListCustomersForFilterResponse = ListCustomersForFilterResult | ListCustomersForFilterError;

export async function listCustomersForFilter(): Promise<ListCustomersForFilterResponse> {
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

  if (!userPermissions.includes('customer:read')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_ref, company_name, city, state')
    .eq('is_active', true)
    .order('company_name', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[listCustomersForFilter] Query error:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }

  return {
    success: true,
    customers: (data ?? []).map((c) => ({
      id: c.id,
      customerRef: c.customer_ref,
      companyName: c.company_name,
      city: c.city,
      state: c.state,
    })),
  };
}