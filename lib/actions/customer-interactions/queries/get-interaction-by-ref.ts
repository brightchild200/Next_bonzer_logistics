'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { CustomerInteraction, InteractionChannel } from '../types';

type CustomerInteractionRow = {
  id: string;
  interaction_ref: string;
  customer_id: string;
  customer: Array<{
    customer_ref: string;
    company_name: string;
  }>;
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
  contact_person_name: string;
  contact_person_mobile: string;
  contact_person_email: string | null;
  contact_person_designation: string | null;
  interaction_channel: string;
  interaction_duration_minutes: number | null;
};

export interface GetInteractionByRefResult {
  success: true;
  interaction: CustomerInteraction;
}

export interface GetInteractionByRefError {
  success: false;
  error: string;
}

export type GetInteractionByRefResponse = GetInteractionByRefResult | GetInteractionByRefError;

export async function getInteractionByRef(
  interactionRef: string
): Promise<GetInteractionByRefResponse> {
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

  const hasReadAll = userPermissions.includes(PERMISSIONS.INTERACTION.READ_ALL);
  const hasReadOwn = userPermissions.includes(PERMISSIONS.INTERACTION.READ_OWN);

  if (!hasReadAll && !hasReadOwn) {
    return { success: false, error: 'Insufficient permissions' };
  }

  let query = supabase
    .from('customer_interactions')
    .select(
      `
      id,
      interaction_ref,
      customer_id,
      customer:customers!customer_id (
        customer_ref,
        company_name
      ),
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
      is_active,
      contact_person_name,
      contact_person_mobile,
      contact_person_email,
      contact_person_designation,
      interaction_channel,
      interaction_duration_minutes
      `
    )
    .eq('interaction_ref', interactionRef);

  if (!hasReadAll && hasReadOwn) {
    query = query.eq('employee_id', user.id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return { success: false, error: 'Interaction not found' };
  }

  const row = data as CustomerInteractionRow;
  const customer = row.customer?.[0] ?? null;

  return {
    success: true,
    interaction: {
      id: row.id,
      interactionRef: row.interaction_ref,
      customerId: row.customer_id,
      customerRef: customer?.customer_ref ?? '',
      companyName: customer?.company_name ?? '',
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
      contactPersonName: row.contact_person_name,
      contactPersonMobile: row.contact_person_mobile,
      contactPersonEmail: row.contact_person_email,
      contactPersonDesignation: row.contact_person_designation,
      interactionChannel: row.interaction_channel as InteractionChannel,
      interactionDurationMinutes: row.interaction_duration_minutes,
    },
  };
}