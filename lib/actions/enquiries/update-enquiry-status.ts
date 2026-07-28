'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryStatus, EnquiryWorkflowRecord, UpdateEnquiryStatusInput } from './types';

export type UpdateEnquiryStatusResult =
  | {
      success: true;
      enquiry: EnquiryWorkflowRecord;
    }
  | {
      success: false;
      error: string;
    };

function getTimestampPatch(status: Exclude<EnquiryStatus, 'new'>) {
  const now = new Date().toISOString();

  if (status === 'quoted') {
    return { quoted_at: now };
  }

  if (status === 'won') {
    return { won_at: now };
  }

  if (status === 'lost') {
    return { lost_at: now };
  }

  return { archived_at: now };
}

export async function updateEnquiryStatus(
  input: UpdateEnquiryStatusInput
): Promise<UpdateEnquiryStatusResult> {
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

  if (!userPermissions.includes(PERMISSIONS.ENQUIRY.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const enquiryId = input.enquiryId?.trim();
  if (!enquiryId) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  const nextStatus = input.status;

  const { data: existingEnquiry, error: fetchError } = await supabase
    .from('enquiries')
    .select(
      `
      id,
      status,
      assigned_customer_service_id,
      assigned_by,
      assigned_at,
      quoted_at,
      won_at,
      lost_at,
      archived_at,
      closed_by
      `
    )
    .eq('id', enquiryId)
    .single();

  if (fetchError || !existingEnquiry) {
    return { success: false, error: 'Enquiry not found' };
  }

  if (existingEnquiry.status === 'archived') {
    return { success: false, error: 'Archived enquiries cannot be changed' };
  }

  if (existingEnquiry.status === nextStatus) {
    return { success: false, error: 'Enquiry is already in this status' };
  }

  const patch = getTimestampPatch(nextStatus);
  const shouldClose = nextStatus === 'won' || nextStatus === 'lost' || nextStatus === 'archived';
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    ...patch,
  };

  if (shouldClose) {
    updatePayload.closed_by = user.id;
    updatePayload.assigned_customer_service_id = null;
  }

  const { data: updatedEnquiry, error: updateError } = await supabase
    .from('enquiries')
    .update(updatePayload)
    .eq('id', enquiryId)
    .select(
      `
      id,
      owner_id,
      reference,
      customer_id,
      customer_name,
      origin,
      destination,
      mode,
      cargo_type,
      weight_kg,
      volume_cbm,
      incoterm,
      status,
      expected_shipment_date,
      notes,
      assigned_customer_service_id,
      assigned_by,
      assigned_at,
      quoted_at,
      won_at,
      lost_at,
      archived_at,
      closed_by,
      created_at,
      updated_at
      `
    )
    .single();

  if (updateError || !updatedEnquiry) {
    return { success: false, error: 'Failed to update enquiry status' };
  }

  return {
    success: true,
    enquiry: updatedEnquiry as EnquiryWorkflowRecord,
  };
}
