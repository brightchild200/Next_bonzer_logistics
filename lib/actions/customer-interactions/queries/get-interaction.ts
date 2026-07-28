'use server';

import { createClient } from '@/lib/db/server';
import type { Permission } from '@/lib/auth/permissions';
import type { CustomerInteraction } from '../types';

type CustomerInteractionRow = {
  id: string;
  interaction_ref: string;
  customer_id: string;
  enquiry_id: string | null;
  employee_id: string;
  interaction_type_id: string;
  interaction_outcome_id: string;
  subject: string | null;
  notes: string;
  interaction_at: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export interface GetInteractionResult {
  success: true;
  interaction: CustomerInteraction;
}

export interface GetInteractionError {
  success: false;
  error: string;
}

export type GetInteractionResponse = GetInteractionResult | GetInteractionError;

export async function getInteraction(
  interactionId: string
): Promise<GetInteractionResponse> {
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

  if (!userPermissions.includes('interaction:read_all')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('customer_interactions')
    .select(
      `
      id,
      interaction_ref,
      customer_id,
      enquiry_id,
      employee_id,
      interaction_type_id,
      interaction_outcome_id,
      subject,
      notes,
      interaction_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_active
      `
    )
    .eq('id', interactionId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Interaction not found' };
  }

  const row = data as CustomerInteractionRow;

  return {
    success: true,
    interaction: {
      id: row.id,
      interactionRef: row.interaction_ref,
      customerId: row.customer_id,
      enquiryId: row.enquiry_id,
      employeeId: row.employee_id,
      interactionTypeId: row.interaction_type_id,
      interactionOutcomeId: row.interaction_outcome_id,
      subject: row.subject,
      notes: row.notes,
      interactionAt: row.interaction_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    },
  };
}