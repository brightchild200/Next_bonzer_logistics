'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  QuotationItem,
  UpdateQuotationItemInput,
  UpdateQuotationItemResult,
  QuotationStatus,
} from '../types';
import {
  validateQuotationItemInput,
  isSupportedCurrency,
} from '../validations';

const RESTRICTED_STATUSES_FOR_ITEMS: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function updateQuotationItem(input: UpdateQuotationItemInput): Promise<UpdateQuotationItemResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateQuotationItemInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { item_id, ...updateData } = input;

  if (!item_id?.trim()) {
    return { success: false, error: 'Item ID is required' };
  }

  const { data: existingItem, error: itemError } = await supabase
    .from('quotation_items')
    .select(
      `
      *,
      quotation:quotations!inner (
        id,
        status,
        base_currency
      )
    `
    )
    .eq('id', item_id)
    .maybeSingle();

  if (itemError) {
    console.error('[updateQuotationItem] Item fetch error:', itemError);
    return { success: false, error: 'Failed to fetch quotation item' };
  }

  if (!existingItem) {
    return { success: false, error: 'Quotation item not found' };
  }

  if (RESTRICTED_STATUSES_FOR_ITEMS.includes(existingItem.quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot update items in quotation with '${existingItem.quotation.status}' state` };
  }

  if (updateData.cost_currency && !isSupportedCurrency(updateData.cost_currency)) {
    return { success: false, error: `Unsupported cost currency: ${updateData.cost_currency}` };
  }

  if (updateData.vendor_id) {
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', updateData.vendor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (vendorError) {
      console.error('[updateQuotationItem] Vendor validation error:', vendorError);
      return { success: false, error: 'Failed to validate vendor' };
    }
    if (!vendor) {
      return { success: false, error: 'Vendor not found or inactive' };
    }
  }

  const updatePayload: Record<string, any> = {
    category: updateData.category,
    description: updateData.description.trim(),
    unit: updateData.unit?.trim() || 'PER',
    quantity: updateData.quantity,
    vendor_id: updateData.vendor_id || null,
    vendor_quote_ref: updateData.vendor_quote_ref?.trim() || null,
    cost_rate: updateData.cost_rate,
    cost_currency: updateData.cost_currency?.toUpperCase() || existingItem.cost_currency,
    cost_exchange_rate: updateData.cost_exchange_rate,
    cost_exchange_rate_date: updateData.cost_exchange_rate_date
      ? new Date(updateData.cost_exchange_rate_date).toISOString().split('T')[0]
      : null,
    margin_pct: updateData.margin_pct ?? null,
    selling_currency: existingItem.quotation.base_currency,
  };

  const { data, error } = await supabase
    .from('quotation_items')
    .update(updatePayload)
    .eq('id', item_id)
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
    console.error('[updateQuotationItem] Update error:', error);
    return { success: false, error: 'Failed to update quotation item' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: existingItem.quotation_id,
    action: 'item_updated',
    description: `Item "${data.description}" updated in quotation`,
    owner_id: authContext.userId,
    old_values: { ...existingItem },
    new_values: { ...data },
  });

  return {
    success: true,
    item: data as QuotationItem,
  };
}