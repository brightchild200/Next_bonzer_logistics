'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { CustomerServiceInboxFilters, EnquiryWorkflowRecord } from './types';

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
  filters: CustomerServiceInboxFilters = {}
): Promise<ListCustomerServiceEnquiriesResponse> {
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

  if (
    !userPermissions.includes(PERMISSIONS.ENQUIRY.READ_TEAM) &&
    !userPermissions.includes(PERMISSIONS.ENQUIRY.ASSIGN_CS) &&
    !userPermissions.includes(PERMISSIONS.ADMIN.USER_READ)
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const statuses = Array.isArray(filters.status)
    ? filters.status
    : filters.status
      ? [filters.status]
      : ['new', 'quoted'];

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
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (filters.assignedCustomerServiceId) {
    query = query.eq('assigned_customer_service_id', filters.assignedCustomerServiceId);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: 'Failed to fetch enquiries' };
  }

  return {
    success: true,
    enquiries: (data ?? []) as EnquiryWorkflowRecord[],
    total: count ?? 0,
    limit,
    offset,
  };
}
