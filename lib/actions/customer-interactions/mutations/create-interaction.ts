'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
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

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;
  const userId = authContext.userId;

  if (!hasPermission(authContext, PERMISSIONS.INTERACTION.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.customerId) {
    return { success: false, error: 'Customer ID is required' };
  }

  // Use provided employeeId or fall back to current user
  const employeeId = input.employeeId ?? userId;

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

  if (!input.contactPersonName || !input.contactPersonName.trim()) {
    return { success: false, error: 'Contact person name is required' };
  }

  if (!input.contactPersonMobile || !input.contactPersonMobile.trim()) {
    return { success: false, error: 'Contact person mobile is required' };
  }

  if (!input.interactionChannel) {
    return { success: false, error: 'Interaction channel is required' };
  }

  if (input.interactionDurationMinutes !== undefined && input.interactionDurationMinutes !== null && input.interactionDurationMinutes < 0) {
    return { success: false, error: 'Interaction duration must be >= 0' };
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

  // Validate employee exists
  const { data: employee, error: employeeError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', employeeId)
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
      employee_id: employeeId,
      interaction_type_id: input.interactionTypeId,
      interaction_outcome_id: input.interactionOutcomeId,
      subject: input.subject?.trim() || null,
      notes: input.notes.trim(),
      interaction_at: input.interactionAt,
      contact_person_name: input.contactPersonName.trim(),
      contact_person_mobile: input.contactPersonMobile.trim(),
      contact_person_email: input.contactPersonEmail?.trim() || null,
      contact_person_designation: input.contactPersonDesignation?.trim() || null,
      interaction_channel: input.interactionChannel,
      interaction_duration_minutes: input.interactionDurationMinutes ?? null,
      created_by: userId,
      updated_by: userId,
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