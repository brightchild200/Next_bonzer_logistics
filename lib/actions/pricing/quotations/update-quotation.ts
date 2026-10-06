'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Quotation,
  UpdateQuotationInput,
  CreateQuotationResult,
  SupportedCurrency,
} from '../types';
import {
  validateUpdateQuotationInput,
  isSupportedCurrency,
} from '../validations';

const VALID_EXCHANGE_RATE_SOURCES = ['manual', 'rbi', 'api'] as const;

const RESTRICTED_STATUSES_FOR_UPDATE: string[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function updateQuotation(input: UpdateQuotationInput): Promise<CreateQuotationResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateUpdateQuotationInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { quotation_id, ...updateData } = input;

  if (!quotation_id?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const { data: existingQuotation, error: fetchError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotation_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[updateQuotation] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch quotation' };
  }

  if (!existingQuotation) {
    return { success: false, error: 'Quotation not found' };
  }

  if (RESTRICTED_STATUSES_FOR_UPDATE.includes(existingQuotation.status)) {
    return { success: false, error: `Cannot update quotation in '${existingQuotation.status}' state` };
  }

  if (updateData.base_currency && !isSupportedCurrency(updateData.base_currency)) {
    return { success: false, error: `Unsupported base currency: ${updateData.base_currency}` };
  }

  if (updateData.quote_currency && !isSupportedCurrency(updateData.quote_currency)) {
    return { success: false, error: `Unsupported quote currency: ${updateData.quote_currency}` };
  }

  if (updateData.exchange_rate_source &&
      !VALID_EXCHANGE_RATE_SOURCES.includes(updateData.exchange_rate_source as any)) {
    return { success: false, error: `Invalid exchange rate source. Must be one of: ${VALID_EXCHANGE_RATE_SOURCES.join(', ')}` };
  }

  const updatePayload: Record<string, any> = {};

  if (updateData.base_currency) {
    updatePayload.base_currency = updateData.base_currency.toUpperCase();
  }
  if (updateData.quote_currency) {
    updatePayload.quote_currency = updateData.quote_currency.toUpperCase();
  }
  if (updateData.exchange_rate !== undefined) {
    updatePayload.exchange_rate = updateData.exchange_rate;
  }
  if (updateData.exchange_rate_date) {
    updatePayload.exchange_rate_date = new Date(updateData.exchange_rate_date).toISOString().split('T')[0];
  }
  if (updateData.exchange_rate_source) {
    updatePayload.exchange_rate_source = updateData.exchange_rate_source;
  }
  if (updateData.margin_pct !== undefined) {
    updatePayload.margin_pct = updateData.margin_pct;
  }
  if (updateData.valid_until !== undefined) {
    updatePayload.valid_until = updateData.valid_until
      ? new Date(updateData.valid_until).toISOString().split('T')[0]
      : null;
  }
  if (updateData.payment_terms !== undefined) {
    updatePayload.payment_terms = updateData.payment_terms?.trim() || null;
  }
  if (updateData.notes !== undefined) {
    updatePayload.notes = updateData.notes?.trim() || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, quotation: existingQuotation as Quotation };
  }

  const { data, error } = await supabase
    .from('quotations')
    .update(updatePayload)
    .eq('id', quotation_id)
    .select('*')
    .single();

  if (error) {
    console.error('[updateQuotation] Update error:', error);
    return { success: false, error: 'Failed to update quotation' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: quotation_id,
    action: 'updated',
    description: `Quotation ${data.quotation_ref} updated`,
    owner_id: authContext.userId,
    old_values: { ...existingQuotation },
    new_values: { ...data },
  });

  return {
    success: true,
    quotation: data as Quotation,
  };
}