'use server';

import { unstable_cache } from 'next/cache';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';

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

async function fetchAllCustomers(): Promise<CustomerOption[]> {
  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_ref, company_name, city, state')
    .eq('is_active', true)
    .order('company_name', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[listCustomersForFilter] Query error:', error);
    throw new Error('Failed to fetch customers');
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    customerRef: c.customer_ref,
    companyName: c.company_name,
    city: c.city,
    state: c.state,
  }));
}

const getCachedAllCustomers = unstable_cache(
  fetchAllCustomers,
  ['customers-for-filter'],
  { revalidate: 300, tags: ['customers-for-filter'] }
);

export async function listCustomersForFilter(): Promise<ListCustomersForFilterResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const customers = await getCachedAllCustomers();
    return { success: true, customers };
  } catch {
    return { success: false, error: 'Failed to fetch customers' };
  }
}