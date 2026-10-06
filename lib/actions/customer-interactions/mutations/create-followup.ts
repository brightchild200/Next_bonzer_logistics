'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
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

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;
  const userId = authContext.userId;

  if (!hasPermission(authContext, PERMISSIONS.INTERACTION.CREATE)) {
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
      created_by: userId,
      updated_by: userId,
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

  if (status === 'Pending') {
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_id: userId,
        title: 'Follow-up scheduled',
        message: `Follow-up ${followupRef} is scheduled for ${new Date(input.dueAt).toLocaleString('en-IN')}.`,
        severity: 'info',
        channel: 'in_app',
        metadata: {
          followupId: followup.id,
          interactionId: input.interactionId,
          followupRef,
          dueAt: input.dueAt,
        },
      });

    if (notificationError) {
      console.error('[createFollowup] Notification insert error:', notificationError);
    }
  }

  return {
    success: true,
    followup: followup as InteractionFollowup,
  };
}
