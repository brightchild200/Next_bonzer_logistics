'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Shipper, ListShippersParams, ListShippersResponse, ListShippersResult, ListShippersError } from './types';

export async function listShippers(
  params: ListShippersParams = {}
): Promise<ListShippersResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.READ)) {
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
      is_active,
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