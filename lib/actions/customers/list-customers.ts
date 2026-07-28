'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { Customer } from './types';

export interface ListCustomersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type ListCustomersResult =
  | { success: true; customers: Customer[]; totalCount: number }
  | { success: false; error: string };

export async function listCustomers(params: ListCustomersParams = {}): Promise<ListCustomersResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError || !authContext) {
    return {
      success: false,
      error: 'Failed to resolve auth context',
    };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.READ)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const {
    search = '',
    page = 0,
    pageSize = 20,
    sortBy = 'company_name',
    sortOrder = 'asc',
  } = params;

  const cappedPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = page * cappedPageSize;

  let query = supabase
    .from('customers')
    .select(
      `
        id,
        customer_ref,
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
        kyc_status,
        is_active,
        created_by,
        created_at,
        updated_at
      `,
      { count: 'exact' }
    );

  if (search.trim()) {
    const searchTerm = search.trim();
    const normalized = searchTerm.toLowerCase();

    query = query.or(
      `company_name.ilike.%${searchTerm}%,` +
      `customer_ref.ilike.%${searchTerm}%,` +
      `contact_person.ilike.%${searchTerm}%,` +
      `email.ilike.%${searchTerm}%,` +
      `phone.ilike.%${searchTerm}%,` +
      `city.ilike.%${searchTerm}%,` +
      `state.ilike.%${searchTerm}%,` +
      `country.ilike.%${searchTerm}%,` +
      `gst_number.ilike.%${searchTerm}%,` +
      `pan_number.ilike.%${searchTerm}%`
    );
  }

  const validSortColumns = ['company_name', 'customer_ref', 'created_at', 'updated_at', 'city', 'state', 'kyc_status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'company_name';
  const sortDirection = sortOrder === 'desc' ? 'desc' : 'asc';

  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('List customers error:', error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    customers: (data ?? []) as Customer[],
    totalCount: count ?? 0,
  };
}