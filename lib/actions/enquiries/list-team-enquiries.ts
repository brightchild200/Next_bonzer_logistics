'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, EnquiryStatus } from './types';
import { startTimer, logPerfEnd, logPerf, endTimer } from '@/lib/perf/timing';

export interface ListTeamEnquiriesFilters {
  status?: EnquiryStatus | EnquiryStatus[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListTeamEnquiriesResult {
  success: true;
  enquiries: EnquiryWorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListTeamEnquiriesError {
  success: false;
  error: string;
}

export type ListTeamEnquiriesResponse = ListTeamEnquiriesResult | ListTeamEnquiriesError;

export async function listTeamEnquiries(
  filters: ListTeamEnquiriesFilters = {},
  traceId?: string
): Promise<ListTeamEnquiriesResponse> {
  const totalStart = startTimer();
  const tid = traceId;

  const clientCreateStart = startTimer();
  const supabase = createClient();
  logPerf(tid!, 'createClient', endTimer(clientCreateStart));

  const authStart = startTimer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  logPerfEnd(tid!, 'auth.getUser', authStart);

  if (authError || !user) {
    logPerfEnd(tid!, 'listTeamEnquiries total (unauthorized)', totalStart);
    return { success: false, error: 'Unauthorized' };
  }

  const authContextStart = startTimer();
  const { data: authContext, error: authContextError } = await supabase.rpc(
    'get_my_auth_context'
  );
  logPerfEnd(tid!, 'get_my_auth_context RPC', authContextStart);

  if (authContextError || !authContext) {
    logPerfEnd(tid!, 'listTeamEnquiries total (auth context error)', totalStart);
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.ENQUIRY.READ_TEAM)) {
    logPerfEnd(tid!, 'listTeamEnquiries total (insufficient permissions)', totalStart);
    return { success: false, error: 'Insufficient permissions' };
  }

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
    logPerfEnd(tid!, 'listTeamEnquiries total (query error)', totalStart);
    return { success: false, error: 'Failed to fetch team enquiries' };
  }

  logPerfEnd(tid!, 'listTeamEnquiries total', totalStart);

  return {
    success: true,
    enquiries: (data ?? []) as EnquiryWorkflowRecord[],
    total: count ?? 0,
    limit,
    offset,
  };
}