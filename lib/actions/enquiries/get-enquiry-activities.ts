'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface EnquiryActivity {
  id: string;
  action: string;
  description: string | null;
  owner_id: string;
  actor_name: string | null;
  actor_employee_code: string | null;
  created_at: string;
}

export interface GetEnquiryActivitiesResult {
  success: true;
  activities: EnquiryActivity[];
}

export interface GetEnquiryActivitiesError {
  success: false;
  error: string;
}

export type GetEnquiryActivitiesResponse = GetEnquiryActivitiesResult | GetEnquiryActivitiesError;

export async function getEnquiryActivities(
  enquiryId: string
): Promise<GetEnquiryActivitiesResponse> {
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

  const canRead = userPermissions.some((p) =>
    [
      PERMISSIONS.ENQUIRY.READ_OWN,
      PERMISSIONS.ENQUIRY.READ_TEAM,
      PERMISSIONS.ENQUIRY.READ_ASSIGNED,
      PERMISSIONS.ENQUIRY.READ_ALL,
    ].includes(p as any)
  );

  if (!canRead) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select(
      `
      id,
      action,
      description,
      owner_id,
      created_at,
      profiles:owner_id (
        full_name,
        employee_code
      )
      `
    )
    .eq('entity_type', 'enquiry')
    .eq('entity_id', enquiryId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'Failed to fetch activities' };
  }

  const activities = (data ?? []).map((row: any) => ({
    id: row.id,
    action: row.action,
    description: row.description,
    owner_id: row.owner_id,
    actor_name: row.profiles?.full_name ?? null,
    actor_employee_code: row.profiles?.employee_code ?? null,
    created_at: row.created_at,
  }));

  return {
    success: true,
    activities,
  };
}