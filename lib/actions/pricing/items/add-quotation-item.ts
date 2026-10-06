'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  QuotationItem,
  CreateQuotationItemInput,
  CreateQuotationItemResult,
  QuotationStatus,
} from '../types';
import {
  validateQuotationItemInput,
  isValidQuotationItemCategory,
  isSupportedCurrency,
} from '../validations';

const RESTRICTED_STATUSES_FOR_ITEMS: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function addQuotationItem(input: CreateQuotationItemInput): Promise<CreateQuotationItemResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateQuotationItemInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { quotation_id, ...itemData } = input;

  if (!quotation_id?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, status, base_currency')
    .eq('id', quotation_id)
    .maybeSingle();

  if (quotationError) {
    console.error('[addQuotationItem] Quotation fetch error:', quotationError);
    return { success: false, error: 'Failed to validate quotation' };
  }

  if (!quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  if (RESTRICTED_STATUSES_FOR_ITEMS.includes(quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot add items to quotation in '${quotation.status}' state` };
  }

  if (!isSupportedCurrency(itemData.cost_currency)) {
    return { success: false, error: `Unsupported cost currency: ${itemData.cost_currency}` };
  }

  if (itemData.vendor_id) {
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', itemData.vendor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (vendorError) {
      console.error('[addQuotationItem] Vendor validation error:', vendorError);
      return { success: false, error: 'Failed to validate vendor' };
    }
    if (!vendor) {
      return { success: false, error: 'Vendor not found or inactive' };
    }
  }

  const { data: maxSortOrder } = await supabase
    .from('quotation_items')
    .select('sort_order')
    .eq('quotation_id', quotation_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxSortOrder?.sort_order ?? -1) + 1;

  const insertPayload = {
    quotation_id,
    sort_order: nextSortOrder,
    category: itemData.category,
    description: itemData.description.trim(),
    unit: itemData.unit?.trim() || 'PER',
    quantity: itemData.quantity,
    vendor_id: itemData.vendor_id || null,
    vendor_quote_ref: itemData.vendor_quote_ref?.trim() || null,
    cost_rate: itemData.cost_rate,
    cost_currency: itemData.cost_currency.toUpperCase(),
    cost_exchange_rate: itemData.cost_exchange_rate,
    cost_exchange_rate_date: itemData.cost_exchange_rate_date
      ? new Date(itemData.cost_exchange_rate_date).toISOString().split('T')[0]
      : null,
    margin_pct: itemData.margin_pct ?? null,
    selling_currency: quotation.base_currency,
  };

  const { data, error } = await supabase
    .from('quotation_items')
    .insert(insertPayload)
    .select(
      `
      *,
      vendor:vendors!left (
        id,
        vendor_ref,
        company_name,
        contact_person,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        gst_number,
        pan_number,
        is_active
      )
    `
    )
    .single();

  if (error) {
    console.error('[addQuotationItem] Insert error:', error);
    return { success: false, error: 'Failed to add quotation item' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: quotation_id,
    action: 'item_added',
    description: `Item "${data.description}" added to quotation`,
    owner_id: authContext.userId,
    new_values: { ...data },
  });

  return {
    success: true,
    item: data as QuotationItem,
  };
}