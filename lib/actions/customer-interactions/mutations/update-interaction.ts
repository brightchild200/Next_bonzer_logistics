'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  UpdateInteractionInput,
  CustomerInteraction,
} from '../types';

export type UpdateInteractionResult =
  | {
      success: true;
      interaction: CustomerInteraction;
    }
  | {
      success: false;
      error: string;
    };

export async function updateInteraction(
  input: UpdateInteractionInput
): Promise<UpdateInteractionResult> {
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

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.interactionId) {
    return { success: false, error: 'Interaction ID is required' };
  }

  const { data: existingInteraction, error: fetchError } = await supabase
    .from('customer_interactions')
    .select('id')
    .eq('id', input.interactionId)
    .single();

  if (fetchError || !existingInteraction) {
    return { success: false, error: 'Interaction not found' };
  }

  const updateData: Record<string, unknown> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (input.interactionOutcomeId !== undefined) {
    const { data: outcome, error: outcomeError } = await supabase
      .from('interaction_outcomes')
      .select('id')
      .eq('id', input.interactionOutcomeId)
      .eq('is_active', true)
      .single();

    if (outcomeError || !outcome) {
      return { success: false, error: 'Invalid interaction outcome' };
    }
    updateData.interaction_outcome_id = input.interactionOutcomeId;
  }

  if (input.subject !== undefined) {
    updateData.subject = input.subject?.trim() || null;
  }

  if (input.notes !== undefined) {
    if (!input.notes || !input.notes.trim()) {
      return { success: false, error: 'Notes cannot be empty' };
    }
    updateData.notes = input.notes.trim();
  }

  if (input.interactionAt !== undefined) {
    if (!input.interactionAt) {
      return { success: false, error: 'Interaction date/time is required' };
    }
    updateData.interaction_at = input.interactionAt;
  }

  if (input.isActive !== undefined) {
    updateData.is_active = input.isActive;
  }

  const { data: interaction, error: updateError } = await supabase
    .from('customer_interactions')
    .update(updateData)
    .eq('id', input.interactionId)
    .select()
    .single();

  if (updateError || !interaction) {
    console.error('[updateInteraction] Update error:', updateError);
    return { success: false, error: 'Failed to update interaction' };
  }

  return {
    success: true,
    interaction: interaction as CustomerInteraction,
  };
}