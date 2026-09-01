'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { CustomerServiceInboxFilters, EnquiryWorkflowRecord } from './types';
import { startTimer, logPerfEnd, logPerf, endTimer } from '@/lib/perf/timing';

export interface ListCustomerServiceEnquiriesResult {
  success: true;
  enquiries: EnquiryWorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListCustomerServiceEnquiriesError {
  success: false;
  error: string;
}

export type ListCustomerServiceEnquiriesResponse =
  | ListCustomerServiceEnquiriesResult
  | ListCustomerServiceEnquiriesError;

export async function listCustomerServiceEnquiries(
  filters: CustomerServiceInboxFilters = {},
  traceId?: string
): Promise<ListCustomerServiceEnquiriesResponse> {
  const totalStart = startTimer();
  const tid = traceId;

  const authResult = await getAuthContext();

  if (!authResult.success) {
    logPerfEnd(tid!, 'listCustomerServiceEnquiries total (unauthorized)', totalStart);
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (
    !hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_TEAM) &&
    !hasPermission(authContext, PERMISSIONS.ENQUIRY.ASSIGN_CS) &&
    !hasPermission(authContext, PERMISSIONS.ADMIN.USER_READ)
  ) {
    logPerfEnd(tid!, 'listCustomerServiceEnquiries total (insufficient permissions)', totalStart);
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
      : ['new', 'quoted'];

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

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (filters.assignedCustomerServiceId) {
    query = query.eq('assigned_customer_service_id', filters.assignedCustomerServiceId);
  }

  const { data, error, count } = await query;
  logPerfEnd(tid!, 'enquiry query', queryStart);

  if (error) {
    logPerfEnd(tid!, 'listCustomerServiceEnquiries total (query error)', totalStart);
    return { success: false, error: 'Failed to fetch enquiries' };
  }

  logPerfEnd(tid!, 'listCustomerServiceEnquiries total', totalStart);

  return {
    success: true,
    enquiries: (data ?? []) as EnquiryWorkflowRecord[],
    total: count ?? 0,
    limit,
    offset,
  };
}
