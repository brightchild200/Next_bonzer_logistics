'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Quotation,
  ChangeQuotationStatusInput,
  ChangeQuotationStatusResult,
  QuotationStatus,
} from '../types';
import {
  validateQuotationStatus,
  isValidQuotationStatusTransition,
} from '../validations';

const SEND_PERMISSION_STATUSES: QuotationStatus[] = ['sent_to_sales'];
const APPROVAL_PERMISSION_STATUSES: QuotationStatus[] = ['customer_approved'];
const ADMIN_STATUSES: QuotationStatus[] = ['rejected', 'expired', 'cancelled'];

export async function changeQuotationStatus(input: ChangeQuotationStatusInput): Promise<ChangeQuotationStatusResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  const { quotation_id, status } = input;

  if (!quotation_id?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const statusValidationError = validateQuotationStatus(status);
  if (statusValidationError) {
    return { success: false, error: statusValidationError };
  }

  const { data: existingQuotation, error: fetchError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotation_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[changeQuotationStatus] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch quotation' };
  }

  if (!existingQuotation) {
    return { success: false, error: 'Quotation not found' };
  }

  if (existingQuotation.status === status) {
    return { success: false, error: `Quotation is already in '${status}' state` };
  }

  if (!isValidQuotationStatusTransition(existingQuotation.status, status)) {
    return {
      success: false,
      error: `Invalid status transition from '${existingQuotation.status}' to '${status}'`,
    };
  }

  let requiredPermission: Permission;

  if (SEND_PERMISSION_STATUSES.includes(status)) {
    requiredPermission = PERMISSIONS.PRICING.SEND;
  } else if (APPROVAL_PERMISSION_STATUSES.includes(status)) {
    requiredPermission = PERMISSIONS.PRICING.SEND;
  } else if (ADMIN_STATUSES.includes(status)) {
    requiredPermission = PERMISSIONS.PRICING.READ_ALL;
  } else if (status === 'revision_requested') {
    requiredPermission = PERMISSIONS.PRICING.REVISE;
  } else {
    requiredPermission = PERMISSIONS.PRICING.UPDATE;
  }

  if (!hasPermission(authContext, requiredPermission) &&
      !hasPermission(authContext, PERMISSIONS.PRICING.READ_ALL)) {
    return { success: false, error: 'Insufficient permissions for this status transition' };
  }

  const updatePayload: Record<string, any> = {
    status,
  };

  if (status === 'sent_to_sales') {
    updatePayload.sent_at = new Date().toISOString();
  } else if (status === 'customer_approved') {
    updatePayload.approved_by = authContext.userId;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('quotations')
    .update(updatePayload)
    .eq('id', quotation_id)
    .select('*')
    .single();

  if (error) {
    console.error('[changeQuotationStatus] Update error:', error);
    return { success: false, error: 'Failed to change quotation status' };
  }

  const actionMap: Record<QuotationStatus, string> = {
    draft: 'status_changed',
    internal_review: 'status_changed',
    sent_to_sales: 'sent',
    customer_discussion: 'status_changed',
    revision_requested: 'revision_requested',
    customer_approved: 'approved',
    rejected: 'rejected',
    expired: 'expired',
    cancelled: 'cancelled',
  };

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: quotation_id,
    action: actionMap[status] ?? 'status_changed',
    description: `Quotation ${data.quotation_ref} status changed from ${existingQuotation.status} to ${status}`,
    owner_id: authContext.userId,
    old_values: { status: existingQuotation.status },
    new_values: { status: data.status, ...updatePayload },
  });

  return {
    success: true,
    quotation: data as Quotation,
  };
}