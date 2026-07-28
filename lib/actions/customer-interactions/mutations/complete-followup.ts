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

  const { data: followup, error: updateError } = await supabase
    .from('interaction_followups')
    .update({
      status: 'Completed',
      completion_notes: input.completionNotes.trim(),
      completed_at: completedAt,
      completed_by: user.id,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('id', input.followupId)
    .select()
    .single();

  if (updateError || !followup) {
    console.error('[completeFollowup] Update error:', updateError);
    return { success: false, error: 'Failed to complete follow-up' };
  }

  return {
    success: true,
    followup: followup as InteractionFollowup,
  };
}