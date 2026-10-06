'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { InteractionFollowup } from '../types';

type FollowupRow = {
  id: string;
  followup_ref: string;
  interaction_id: string;
  due_at: string;
  status: InteractionFollowup['status'];
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  customer_interactions: {
    id: string;
    interaction_ref: string;
    customer_id: string;
    employee_id: string;
    subject: string | null;
    customer: Array<{
      customer_ref: string;
      company_name: string;
    }> | null;
  } | null;
};

export interface GetFollowupsResult {
  success: true;
  followups: InteractionFollowup[];
}

export interface GetFollowupsError {
  success: false;
  error: string;
}

export type GetFollowupsResponse = GetFollowupsResult | GetFollowupsError;

export async function getFollowups(
  interactionId: string
): Promise<GetFollowupsResponse> {
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

  const hasReadAll = userPermissions.includes(PERMISSIONS.FOLLOW_UP.READ_ALL);
  const hasReadOwn = userPermissions.includes(PERMISSIONS.FOLLOW_UP.READ_OWN);

  if (!hasReadAll && !hasReadOwn) {
    return { success: false, error: 'Insufficient permissions' };
  }

  let query = supabase
    .from('interaction_followups')
    .select(
      `
      id,
      followup_ref,
      interaction_id,
      due_at,
      status,
      completion_notes,
      completed_at,
      completed_by,
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_active,
      customer_interactions!interaction_id (
        id,
        interaction_ref,
        customer_id,
        employee_id,
        subject,
        customer:customers!customer_id (
          customer_ref,
          company_name
        )
      )
      `
    )
    .eq('interaction_id', interactionId)
    .order('due_at', { ascending: true });

  if (!hasReadAll && hasReadOwn) {
    const { data: ownInteractions } = await supabase
      .from('customer_interactions')
      .select('id')
      .eq('employee_id', user.id);
    
    const interactionIds = ownInteractions?.map(i => i.id) ?? [];
    if (interactionIds.length > 0) {
      query = query.in('interaction_id', interactionIds);
    } else {
      return { success: true, followups: [] };
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getFollowups] Query error:', error);
    return { success: false, error: 'Failed to fetch follow-ups' };
  }

  return {
    success: true,
    followups: (data ?? []).map((followup) => {
      const row = followup as unknown as FollowupRow;
      const interaction = row.customer_interactions;
      const customer = interaction?.customer?.[0] ?? null;
      return {
        id: row.id,
        followupRef: row.followup_ref,
        interactionId: row.interaction_id,
        interactionRef: interaction?.interaction_ref ?? '',
        customerId: interaction?.customer_id ?? '',
        customerRef: customer?.customer_ref ?? '',
        companyName: customer?.company_name ?? '',
        employeeId: interaction?.employee_id ?? '',
        subject: interaction?.subject ?? null,
        dueAt: row.due_at,
        status: row.status,
        completionNotes: row.completion_notes,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: row.is_active,
      } satisfies InteractionFollowup;
    }),
  };
}