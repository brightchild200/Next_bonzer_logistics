'use server';

import { listMyEnquiries, type ListMyEnquiriesResponse } from './list-my-enquiries';
import { listCustomerServiceEnquiries, type ListCustomerServiceEnquiriesResponse } from './list-customer-service-enquiries';
import { listTeamEnquiries, type ListTeamEnquiriesResponse } from './list-team-enquiries';
import { listAllEnquiries, type ListAllEnquiriesResponse } from './list-all-enquiries';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, ListEnquiriesFilters, EnquiryStatus } from './types';
import { startTimer, logPerfEnd, logPerf, endTimer } from '@/lib/perf/timing';

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

type BranchResult = ListMyEnquiriesResponse | ListTeamEnquiriesResponse | ListAllEnquiriesResponse | ListCustomerServiceEnquiriesResponse;

export async function listEnquiries(
  filters: ListEnquiriesFilters = {},
  traceId?: string
): Promise<ListEnquiriesResponse> {
  const totalStart = startTimer();
  const tid = traceId;

  const authResult = await getAuthContext();

  if (!authResult.success) {
    logPerfEnd(tid!, 'listEnquiries total (unauthorized)', totalStart);
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  const branchStart = startTimer();
  let branchName = 'unknown';
  let result: BranchResult;

  // Priority: Admin (read_all) > Sales Manager (read_team) > Customer Service (read_assigned) > Salesperson (read_own)
  if (hasPermission(authContext, PERMISSIONS.ADMIN.USER_READ)) {
    branchName = 'listAllEnquiries';
    result = await listAllEnquiries(filters, tid);
  } else if (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_TEAM)) {
    branchName = 'listTeamEnquiries';
    result = await listTeamEnquiries(filters, tid);
  } else if (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ASSIGNED)) {
    branchName = 'listCustomerServiceEnquiries';
    result = await listCustomerServiceEnquiries(filters, tid);
  } else if (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_OWN)) {
    branchName = 'listMyEnquiries';
    result = await listMyEnquiries(filters, tid);
  } else {
    logPerfEnd(tid!, 'listEnquiries total (insufficient permissions)', totalStart);
    return { success: false, error: 'Insufficient permissions' };
  }
  logPerfEnd(tid!, 'branch decision', branchStart, { branch: branchName });
  logPerf(tid!, 'branch selected', 0, { branch: branchName });

  if (!result.success) {
    logPerfEnd(tid!, 'listEnquiries total (branch error)', totalStart);
    return result;
  }

  logPerfEnd(tid!, 'listEnquiries total', totalStart);
  return { ...result, source: branchName as 'own' | 'assigned' | 'team' | 'all' };
}