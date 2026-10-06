'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Quotation,
  QuotationItem,
  CreateRevisionInput,
  CreateRevisionResult,
  SupportedCurrency,
} from '../types';
import {
  validateCreateRevisionInput,
  isSupportedCurrency,
} from '../validations';

const VALID_EXCHANGE_RATE_SOURCES = ['manual', 'rbi', 'api'] as const;

const REVISION_ELIGIBLE_STATUSES: string[] = [
  'draft',
  'internal_review',
  'sent_to_sales',
  'customer_discussion',
  'revision_requested',
];

export async function createRevision(input: CreateRevisionInput): Promise<CreateRevisionResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.REVISE)) {
    return { success: false, error: 'Insufficient permissions to create revision' };
  }

  const validationError = validateCreateRevisionInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { quotation_id, copy_items = true, ...revisionData } = input;

  if (!quotation_id?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const { data: parentQuotation, error: fetchError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotation_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[createRevision] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch parent quotation' };
  }

  if (!parentQuotation) {
    return { success: false, error: 'Parent quotation not found' };
  }

  if (!REVISION_ELIGIBLE_STATUSES.includes(parentQuotation.status)) {
    return { success: false, error: `Cannot create revision from quotation in '${parentQuotation.status}' state` };
  }

  if (revisionData.base_currency && !isSupportedCurrency(revisionData.base_currency)) {
    return { success: false, error: `Unsupported base currency: ${revisionData.base_currency}` };
  }

  if (revisionData.quote_currency && !isSupportedCurrency(revisionData.quote_currency)) {
    return { success: false, error: `Unsupported quote currency: ${revisionData.quote_currency}` };
  }

  if (revisionData.exchange_rate_source &&
      !VALID_EXCHANGE_RATE_SOURCES.includes(revisionData.exchange_rate_source as any)) {
    return { success: false, error: `Invalid exchange rate source. Must be one of: ${VALID_EXCHANGE_RATE_SOURCES.join(', ')}` };
  }

  const { data: existingRevisions, error: revisionCheckError } = await supabase
    .from('quotations')
    .select('version')
    .eq('parent_quotation_id', quotation_id)
    .order('version', { ascending: false })
    .limit(1);

  if (revisionCheckError) {
    console.error('[createRevision] Revision check error:', revisionCheckError);
    return { success: false, error: 'Failed to check existing revisions' };
  }

  const nextVersion = (existingRevisions?.[0]?.version ?? parentQuotation.version) + 1;

  const exchangeRateDate = revisionData.exchange_rate_date
    ? new Date(revisionData.exchange_rate_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const newQuotationPayload = {
    enquiry_id: parentQuotation.enquiry_id,
    parent_quotation_id: quotation_id,
    version: nextVersion,
    base_currency: revisionData.base_currency?.toUpperCase() ?? parentQuotation.base_currency,
    quote_currency: revisionData.quote_currency?.toUpperCase() ?? parentQuotation.quote_currency,
    exchange_rate: revisionData.exchange_rate ?? parentQuotation.exchange_rate,
    exchange_rate_date: exchangeRateDate,
    exchange_rate_source: revisionData.exchange_rate_source ?? parentQuotation.exchange_rate_source,
    margin_pct: revisionData.margin_pct ?? parentQuotation.margin_pct,
    valid_until: revisionData.valid_until
      ? new Date(revisionData.valid_until).toISOString().split('T')[0]
      : parentQuotation.valid_until,
    payment_terms: revisionData.payment_terms?.trim() ?? parentQuotation.payment_terms,
    notes: revisionData.notes?.trim() ?? parentQuotation.notes,
    created_by: authContext.userId,
    status: 'draft' as const,
  };

  const { data: newQuotation, error: insertError } = await supabase
    .from('quotations')
    .insert(newQuotationPayload)
    .select('*')
    .single();

  if (insertError) {
    console.error('[createRevision] Insert error:', insertError);
    if (insertError.code === '23505' && insertError.message.includes('unique_enquiry_version')) {
      return { success: false, error: 'Revision version conflict. Please try again.' };
    }
    return { success: false, error: 'Failed to create revision' };
  }

  if (copy_items) {
    const { data: parentItems, error: itemsFetchError } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotation_id)
      .order('sort_order');

    if (itemsFetchError) {
      console.error('[createRevision] Items fetch error:', itemsFetchError);
      return { success: false, error: 'Failed to copy quotation items' };
    }

    if (parentItems && parentItems.length > 0) {
      const itemsToInsert = parentItems.map((item) => ({
        quotation_id: newQuotation.id,
        sort_order: item.sort_order,
        category: item.category,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        vendor_id: item.vendor_id,
        vendor_quote_ref: item.vendor_quote_ref,
        cost_rate: item.cost_rate,
        cost_currency: item.cost_currency,
        cost_exchange_rate: item.cost_exchange_rate,
        cost_exchange_rate_date: item.cost_exchange_rate_date,
        margin_pct: item.margin_pct,
        selling_currency: item.selling_currency,
      }));

      const { error: itemsInsertError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsInsertError) {
        console.error('[createRevision] Items insert error:', itemsInsertError);
        await supabase.from('quotations').delete().eq('id', newQuotation.id);
        return { success: false, error: 'Failed to copy quotation items' };
      }
    }
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: newQuotation.id,
    action: 'revised',
    description: `Revision ${newQuotation.quotation_ref} created from ${parentQuotation.quotation_ref}`,
    owner_id: authContext.userId,
    old_values: { parent_quotation_id: quotation_id, parent_version: parentQuotation.version },
    new_values: { ...newQuotation },
  });

  return {
    success: true,
    quotation: newQuotation as Quotation,
  };
}