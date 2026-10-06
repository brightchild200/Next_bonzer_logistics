'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export interface Consignee {
  id: string;
  consignee_ref: string;
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
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ListConsigneesParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListConsigneesResult {
  success: true;
  consignees: Consignee[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListConsigneesError {
  success: false;
  error: string;
}

export type ListConsigneesResponse = ListConsigneesResult | ListConsigneesError;

export async function listConsignees(
  params: ListConsigneesParams = {}
): Promise<ListConsigneesResponse> {
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
    .from('consignees')
    .select(
      `
      id,
      consignee_ref,
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
      `consignee_ref.ilike.%${searchTerm}%,` +
      `contact_person.ilike.%${searchTerm}%`
    );
  }

  const validSortColumns = ['company_name', 'consignee_ref', 'created_at', 'updated_at', 'city', 'state'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'company_name';
  const sortDirection = sortOrder === 'desc' ? 'desc' : 'asc';

  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[listConsignees] Query error:', error);
    return { success: false, error: 'Failed to fetch consignees' };
  }

  return {
    success: true,
    consignees: (data ?? []) as Consignee[],
    totalCount: count ?? 0,
    limit: cappedPageSize,
    offset,
  };
}