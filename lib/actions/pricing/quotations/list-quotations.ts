'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Quotation,
  ListQuotationsParams,
  ListQuotationsResponse,
  ListQuotationsResult,
  ListQuotationsError,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = ['quotation_ref', 'version', 'status', 'created_at', 'updated_at'] as const;
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;

export async function listQuotations(params: ListQuotationsParams = {}): Promise<ListQuotationsResponse> {
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
    : 'created_at';
  const sortOrder = ALLOWED_SORT_ORDERS.includes(params.sortOrder ?? 'desc')
    ? params.sortOrder
    : 'desc';

  let query = supabase
    .from('quotations')
    .select(
      `
      *,
      enquiry:enquiries!inner (
        id,
        reference,
        customer_id,
        customer_name,
        owner_id
      )
    `,
      { count: 'exact' }
    );

  if (params.enquiryId) {
    query = query.eq('enquiry_id', params.enquiryId);
  }

  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    query = query.in('status', statuses);
  }

  if (params.search) {
    const searchTerm = params.search?.trim?.() ?? '';
    if (searchTerm) {
      query = query.or(
        `quotation_ref.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`
      );
    }
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[listQuotations] Error:', error);
    return { success: false, error: 'Failed to fetch quotations' };
  }

  return {
    success: true,
    quotations: (data ?? []) as Quotation[],
    totalCount: count ?? 0,
    limit: pageSize,
    offset,
  };
}