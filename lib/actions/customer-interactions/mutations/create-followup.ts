'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  CreateFollowupInput,
  InteractionFollowup,
} from '../types';

export type CreateFollowupResult =
  | {
      success: true;
      followup: InteractionFollowup;
    }
  | {
      success: false;
      error: string;
    };

export async function createFollowup(
  input: CreateFollowupInput
): Promise<CreateFollowupResult> {
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

  if (!userPermissions.includes(PERMISSIONS.INTERACTION.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.interactionId) {
    return { success: false, error: 'Interaction ID is required' };
  }

  if (!input.dueAt) {
    return { success: false, error: 'Due date/time is required' };
  }

  const { data: interaction, error: interactionError } = await supabase
    .from('customer_interactions')
    .select('id, is_active')
    .eq('id', input.interactionId)
    .single();

  if (interactionError || !interaction) {
    return { success: false, error: 'Interaction not found' };
  }

  if (!interaction.is_active) {
    return { success: false, error: 'Cannot create follow-up for inactive interaction' };
  }

  const dueDate = new Date(input.dueAt);
  if (isNaN(dueDate.getTime())) {
    return { success: false, error: 'Invalid due date/time format' };
  }

  const { data: followupRef, error: refError } = await supabase.rpc(
    'generate_followup_reference'
  );

  if (refError || !followupRef) {
    return { success: false, error: 'Failed to generate follow-up reference' };
  }

  const now = new Date().toISOString();
  const status = input.status ?? 'Pending';

  const { data: followup, error: insertError } = await supabase
    .from('interaction_followups')
    .insert({
      followup_ref: followupRef,
      interaction_id: input.interactionId,
      due_at: input.dueAt,
      status,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
      is_active: true,
    })
    .select()
    .single();

  if (insertError || !followup) {
    console.error('[createFollowup] Insert error:', insertError);
    return { success: false, error: 'Failed to create follow-up' };
  }

  return {
    success: true,
    followup: followup as InteractionFollowup,
  };
}