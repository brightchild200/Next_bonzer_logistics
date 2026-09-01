'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, EnquiryStatus } from './types';
import { startTimer, logPerfEnd, logPerf, endTimer } from '@/lib/perf/timing';

export interface ListAllEnquiriesFilters {
  status?: EnquiryStatus | EnquiryStatus[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListAllEnquiriesResult {
  success: true;
  enquiries: EnquiryWorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListAllEnquiriesError {
  success: false;
  error: string;
}

export type ListAllEnquiriesResponse = ListAllEnquiriesResult | ListAllEnquiriesError;

export async function listAllEnquiries(
  filters: ListAllEnquiriesFilters = {},
  traceId?: string
): Promise<ListAllEnquiriesResponse> {
  const totalStart = startTimer();
  const tid = traceId;

  const authResult = await getAuthContext();

  if (!authResult.success) {
    logPerfEnd(tid!, 'listAllEnquiries total (unauthorized)', totalStart);
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.ADMIN.USER_READ)) {
    logPerfEnd(tid!, 'listAllEnquiries total (insufficient permissions)', totalStart);
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabase = createClient();

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const sortBy = filters.sortBy ?? 'updated_at';
  const sortDir = filters.sortDir ?? 'desc';

  const statuses = Array.isArray(filters.status)
    ? filters.status
    : filters.status
      ? [filters.status]
      : undefined;

  const queryStart = startTimer();
  let query = supabase
    .from('enquiries')
    .select(
      `
      id,
      owner_id,
      reference,
      customer_id,
      customer_name,
      origin,
      destination,
      mode,
      cargo_type,
      weight_kg,
      volume_cbm,
      incoterm,
      status,
      expected_shipment_date,
      notes,
      assigned_customer_service_id,
      assigned_by,
      assigned_at,
      quoted_at,
      won_at,
      lost_at,
      archived_at,
      closed_by,
      created_at,
      updated_at
      `,
      { count: 'exact' }
    )
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range(offset, offset + limit - 1);

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (filters.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  logPerfEnd(tid!, 'enquiry query', queryStart);

  if (error) {
    logPerfEnd(tid!, 'listAllEnquiries total (query error)', totalStart);
    return { success: false, error: 'Failed to fetch all enquiries' };
  }

  logPerfEnd(tid!, 'listAllEnquiries total', totalStart);

  return {
    success: true,
    enquiries: (data ?? []) as EnquiryWorkflowRecord[],
    total: count ?? 0,
    limit,
    offset,
  };
}