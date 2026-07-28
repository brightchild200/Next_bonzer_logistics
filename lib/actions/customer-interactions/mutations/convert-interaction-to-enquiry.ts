'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface ConvertInteractionToEnquiryResult {
  success: true;
  enquiryId: string;
  enquiryReference: string;
}

export interface ConvertInteractionToEnquiryError {
  success: false;
  error: string;
}

export type ConvertInteractionToEnquiryResponse =
  | ConvertInteractionToEnquiryResult
  | ConvertInteractionToEnquiryError;

export async function convertInteractionToEnquiry(
  interactionId: string
): Promise<ConvertInteractionToEnquiryResponse> {
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

  if (!userPermissions.includes(PERMISSIONS.ENQUIRY.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!interactionId?.trim()) {
    return { success: false, error: 'Interaction ID is required' };
  }

  const { data, error } = await supabase.rpc('convert_interaction_to_enquiry', {
    interaction_uuid: interactionId,
  });

  if (error) {
    const message = error.message || 'Failed to convert interaction to enquiry';

    if (
      message.includes('Interaction already converted to enquiry') ||
      message.includes('Interaction is not eligible for conversion') ||
      message.includes('Interaction is inactive') ||
      message.includes('Interaction not found')
    ) {
      return { success: false, error: message };
    }

    return { success: false, error: message };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.enquiry_id || !row?.enquiry_reference) {
    return { success: false, error: 'Conversion completed but enquiry details were not returned' };
  }

  return {
    success: true,
    enquiryId: row.enquiry_id,
    enquiryReference: row.enquiry_reference,
  };
}
