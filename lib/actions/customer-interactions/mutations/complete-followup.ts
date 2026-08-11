'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  CompleteFollowupInput,
  InteractionFollowup,
} from '../types';

export type CompleteFollowupResult =
  | {
      success: true;
      followup: InteractionFollowup;
    }
  | {
      success: false;
      error: string;
    };

export async function completeFollowup(
  input: CompleteFollowupInput
): Promise<CompleteFollowupResult> {
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

  if (!userPermissions.includes(PERMISSIONS.FOLLOW_UP.UPDATE_OWN)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.followupId) {
    return { success: false, error: 'Follow-up ID is required' };
  }

  if (!input.completionNotes || !input.completionNotes.trim()) {
    return { success: false, error: 'Completion notes are required' };
  }

  const { data: existingFollowup, error: fetchError } = await supabase
    .from('interaction_followups')
    .select('id, status')
    .eq('id', input.followupId)
    .single();

  if (fetchError || !existingFollowup) {
    return { success: false, error: 'Follow-up not found' };
  }

  if (existingFollowup.status === 'Completed') {
    return { success: false, error: 'Follow-up is already completed' };
  }

  const completedAt = input.completedAt ?? new Date().toISOString();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('interaction_followups')
    .update({
      status: 'Completed',
      completion_notes: input.completionNotes.trim(),
      completed_at: completedAt,
      completed_by: user.id,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('id', input.followupId);

  if (updateError) {
    console.error('[completeFollowup] Update error:', updateError);
    return { success: false, error: 'Failed to complete follow-up' };
  }

  // Fetch the updated followup with joined data
  const { data: followup, error: selectError } = await supabase
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
    .eq('id', input.followupId)
    .single();

  if (selectError || !followup) {
    console.error('[completeFollowup] Select error:', selectError);
    return { success: false, error: 'Failed to fetch completed follow-up' };
  }

  const row = followup as unknown as {
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

  const interaction = row.customer_interactions;
  const customer = interaction?.customer?.[0] ?? null;

  return {
    success: true,
    followup: {
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
    } satisfies InteractionFollowup,
  };
}