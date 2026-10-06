'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Vendor,
  ListVendorsParams,
  ListVendorsResponse,
  ListVendorsResult,
  ListVendorsError,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = ['vendor_ref', 'company_name', 'city', 'country', 'created_at', 'updated_at'] as const;
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;

export async function listVendors(params: ListVendorsParams = {}): Promise<ListVendorsResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const sortBy = ALLOWED_SORT_FIELDS.includes(params.sortBy as any)
    ? params.sortBy!
    : 'company_name';
  const sortOrder = ALLOWED_SORT_ORDERS.includes(params.sortOrder ?? 'asc')
    ? params.sortOrder
    : 'asc';

  let query = supabase.from('vendors').select('*', { count: 'exact' });

  if (params.search) {
    const searchTerm = params.search?.trim?.() ?? '';
    if (searchTerm) {
      query = query.or(
        `company_name.ilike.%${searchTerm}%,vendor_ref.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
      );
    }
  }

  if (params.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[listVendors] Error:', error);
    return { success: false, error: 'Failed to fetch vendors' };
  }

  return {
    success: true,
    vendors: (data ?? []) as Vendor[],
    totalCount: count ?? 0,
    limit: pageSize,
    offset,
  };
}