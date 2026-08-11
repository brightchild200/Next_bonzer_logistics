'use server';

import { listMyEnquiries, type ListMyEnquiriesResponse } from './list-my-enquiries';
import { listCustomerServiceEnquiries, type ListCustomerServiceEnquiriesResponse } from './list-customer-service-enquiries';
import { listTeamEnquiries, type ListTeamEnquiriesResponse } from './list-team-enquiries';
import { listAllEnquiries, type ListAllEnquiriesResponse } from './list-all-enquiries';
import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, ListEnquiriesFilters, EnquiryStatus } from './types';

export interface ListEnquiriesResult {
  success: true;
  enquiries: EnquiryWorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
  source: 'own' | 'assigned' | 'team' | 'all';
}

export interface ListEnquiriesError {
  success: false;
  error: string;
}

export type ListEnquiriesResponse = ListEnquiriesResult | ListEnquiriesError;

export async function listEnquiries(
  filters: ListEnquiriesFilters = {}
): Promise<ListEnquiriesResponse> {
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

  // Priority: Admin (read_all) > Sales Manager (read_team) > Customer Service (read_assigned) > Salesperson (read_own)
  if (userPermissions.includes(PERMISSIONS.ADMIN.USER_READ)) {
    const result = await listAllEnquiries(filters);
    if (!result.success) return result;
    return { ...result, source: 'all' };
  }

  if (userPermissions.includes(PERMISSIONS.ENQUIRY.READ_TEAM)) {
    const result = await listTeamEnquiries(filters);
    if (!result.success) return result;
    return { ...result, source: 'team' };
  }

  if (userPermissions.includes(PERMISSIONS.ENQUIRY.READ_ASSIGNED)) {
    const result = await listCustomerServiceEnquiries(filters);
    if (!result.success) return result;
    return { ...result, source: 'assigned' };
  }

  if (userPermissions.includes(PERMISSIONS.ENQUIRY.READ_OWN)) {
    const result = await listMyEnquiries(filters);
    if (!result.success) return result;
    return { ...result, source: 'own' };
  }

  return { success: false, error: 'Insufficient permissions' };
}