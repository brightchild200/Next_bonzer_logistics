'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { AssignEnquiryInput, EnquiryWorkflowRecord } from './types';

export type AssignEnquiryResult =
  | {
      success: true;
      enquiry: EnquiryWorkflowRecord;
    }
  | {
      success: false;
      error: string;
    };

export async function assignEnquiry(
  input: AssignEnquiryInput
): Promise<AssignEnquiryResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.ENQUIRY.ASSIGN_CS)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const enquiryId = input.enquiryId?.trim();
  const customerServiceId = input.customerServiceId?.trim();

  if (!enquiryId) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  if (!customerServiceId) {
    return { success: false, error: 'Customer service user ID is required' };
  }

  const { data: enquiry, error: enquiryError } = await supabase
    .from('enquiries')
    .select('id, status, assigned_customer_service_id, closed_by')
    .eq('id', enquiryId)
    .single();

  if (enquiryError || !enquiry) {
    return { success: false, error: 'Enquiry not found' };
  }

  if (enquiry.status === 'archived') {
    return { success: false, error: 'Archived enquiries cannot be assigned' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', customerServiceId)
    .eq('is_active', true)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Customer service user not found or inactive' };
  }

  const { data: updatedEnquiry, error: updateError } = await supabase
    .from('enquiries')
    .update({
      assigned_customer_service_id: customerServiceId,
      assigned_by: authContext.userId,
      assigned_at: new Date().toISOString(),
    })
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
    return { success: false, error: 'Failed to assign enquiry' };
  }

  return {
    success: true,
    enquiry: updatedEnquiry as EnquiryWorkflowRecord,
  };
}
