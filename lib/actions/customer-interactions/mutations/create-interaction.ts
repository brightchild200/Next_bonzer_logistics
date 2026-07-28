'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  CreateInteractionInput,
  CustomerInteraction,
} from '../types';

export type CreateInteractionResult =
  | {
      success: true;
      interaction: CustomerInteraction;
    }
  | {
      success: false;
      error: string;
    };

export async function createInteraction(
  input: CreateInteractionInput
): Promise<CreateInteractionResult> {
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

  if (!input.customerId) {
    return { success: false, error: 'Customer ID is required' };
  }

  if (!input.employeeId) {
    return { success: false, error: 'Employee ID is required' };
  }

  if (!input.interactionTypeId) {
    return { success: false, error: 'Interaction type is required' };
  }

  if (!input.interactionOutcomeId) {
    return { success: false, error: 'Interaction outcome is required' };
  }

  if (!input.notes || !input.notes.trim()) {
    return { success: false, error: 'Notes are required' };
  }

  if (!input.interactionAt) {
    return { success: false, error: 'Interaction date/time is required' };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', input.customerId)
    .eq('is_active', true)
    .single();

  if (customerError || !customer) {
    return { success: false, error: 'Customer not found or inactive' };
  }

  const { data: interactionType, error: typeError } = await supabase
    .from('interaction_types')
    .select('id')
    .eq('id', input.interactionTypeId)
    .eq('is_active', true)
    .single();

  if (typeError || !interactionType) {
    return { success: false, error: 'Invalid interaction type' };
  }

  const { data: interactionOutcome, error: outcomeError } = await supabase
    .from('interaction_outcomes')
    .select('id')
    .eq('id', input.interactionOutcomeId)
    .eq('is_active', true)
    .single();

  if (outcomeError || !interactionOutcome) {
    return { success: false, error: 'Invalid interaction outcome' };
  }

  const { data: employee, error: employeeError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', input.employeeId)
    .single();

  if (employeeError || !employee) {
    return { success: false, error: 'Employee not found' };
  }

  const { data: interactionRef, error: refError } = await supabase.rpc(
    'generate_interaction_reference'
  );

  if (refError || !interactionRef) {
    return { success: false, error: 'Failed to generate interaction reference' };
  }

  const now = new Date().toISOString();

  const { data: interaction, error: insertError } = await supabase
    .from('customer_interactions')
    .insert({
      interaction_ref: interactionRef,
      customer_id: input.customerId,
      employee_id: input.employeeId,
      interaction_type_id: input.interactionTypeId,
      interaction_outcome_id: input.interactionOutcomeId,
      subject: input.subject?.trim() || null,
      notes: input.notes.trim(),
      interaction_at: input.interactionAt,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
      is_active: true,
    })
    .select()
    .single();

  if (insertError || !interaction) {
    console.error('[createInteraction] Insert error:', insertError);
    return { success: false, error: 'Failed to create interaction' };
  }

  return {
    success: true,
    interaction: interaction as CustomerInteraction,
  };
}