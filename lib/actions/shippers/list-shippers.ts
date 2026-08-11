'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface Shipper {
  id: string;
  shipper_ref: string;
  source_customer_id: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gst_number: string | null;
  pan_number: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ListShippersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListShippersResult {
  success: true;
  shippers: Shipper[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListShippersError {
  success: false;
  error: string;
}

export type ListShippersResponse = ListShippersResult | ListShippersError;

export async function listShippers(
  params: ListShippersParams = {}
): Promise<ListShippersResponse> {
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
    .from('shippers')
    .select(
      `
      id,
      shipper_ref,
      source_customer_id,
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
      created_by,
      created_at,
      updated_at
      `,
      { count: 'exact' }
    );

  if (search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `company_name.ilike.%${searchTerm}%,` +
      `shipper_ref.ilike.%${searchTerm}%,` +
      `contact_person.ilike.%${searchTerm}%`
    );
  }

  const validSortColumns = ['company_name', 'shipper_ref', 'created_at', 'updated_at', 'city', 'state'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'company_name';
  const sortDirection = sortOrder === 'desc' ? 'desc' : 'asc';

  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[listShippers] Query error:', error);
    return { success: false, error: 'Failed to fetch shippers' };
  }

  return {
    success: true,
    shippers: (data ?? []) as Shipper[],
    totalCount: count ?? 0,
    limit: cappedPageSize,
    offset,
  };
}