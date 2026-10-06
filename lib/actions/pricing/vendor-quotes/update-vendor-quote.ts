'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  VendorQuote,
  UpdateVendorQuoteInput,
  UpdateVendorQuoteResult,
  SupportedCurrency,
  QuotationStatus,
} from '../types';
import {
  validateVendorQuoteInput,
  isSupportedCurrency,
} from '../validations';

const RESTRICTED_STATUSES_FOR_VENDOR_QUOTES: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function updateVendorQuote(input: UpdateVendorQuoteInput): Promise<UpdateVendorQuoteResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.MANAGE_VENDOR_QUOTES)) {
    return { success: false, error: 'Insufficient permissions to manage vendor quotes' };
  }

  const { vendor_quote_id, quotation_id, ...updateData } = input;

  if (!vendor_quote_id?.trim()) {
    return { success: false, error: 'Vendor Quote ID is required' };
  }

  const validationError = validateVendorQuoteInput({ quotation_id: quotation_id ?? '', ...updateData });
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { data: existingQuote, error: quoteError } = await supabase
    .from('vendor_quotes')
    .select(
      `
      *,
      quotation:quotations!inner (
        id,
        status,
        quotation_ref
      ),
      vendor:vendors!left (id)
    `
    )
    .eq('id', vendor_quote_id)
    .maybeSingle();

  if (quoteError) {
    console.error('[updateVendorQuote] Fetch error:', quoteError);
    return { success: false, error: 'Failed to fetch vendor quote' };
  }

  if (!existingQuote) {
    return { success: false, error: 'Vendor quote not found' };
  }

  if (RESTRICTED_STATUSES_FOR_VENDOR_QUOTES.includes(existingQuote.quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot update vendor quotes for quotation in '${existingQuote.quotation.status}' state` };
  }

  if (updateData.vendor_id && updateData.vendor_id !== existingQuote.vendor_id) {
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', updateData.vendor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (vendorError) {
      console.error('[updateVendorQuote] Vendor validation error:', vendorError);
      return { success: false, error: 'Failed to validate vendor' };
    }
    if (!vendor) {
      return { success: false, error: 'Vendor not found or inactive' };
    }
  }

  if (updateData.currency && !isSupportedCurrency(updateData.currency)) {
    return { success: false, error: `Unsupported currency: ${updateData.currency}` };
  }

  const updatePayload: Record<string, any> = {};

  if (updateData.vendor_id) updatePayload.vendor_id = updateData.vendor_id;
  if (updateData.vendor_quote_ref !== undefined) updatePayload.vendor_quote_ref = updateData.vendor_quote_ref?.trim() || null;
  if (updateData.quote_date !== undefined) {
    updatePayload.quote_date = updateData.quote_date
      ? new Date(updateData.quote_date).toISOString().split('T')[0]
      : null;
  }
  if (updateData.valid_until !== undefined) {
    updatePayload.valid_until = updateData.valid_until
      ? new Date(updateData.valid_until).toISOString().split('T')[0]
      : null;
  }
  if (updateData.total_amount !== undefined) updatePayload.total_amount = updateData.total_amount;
  if (updateData.currency) updatePayload.currency = updateData.currency.toUpperCase();
  if (updateData.pdf_path !== undefined) updatePayload.pdf_path = updateData.pdf_path?.trim() || null;
  if (updateData.notes !== undefined) updatePayload.notes = updateData.notes?.trim() || null;

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, vendorQuote: existingQuote as VendorQuote };
  }

  const { data, error } = await supabase
    .from('vendor_quotes')
    .update(updatePayload)
    .eq('id', vendor_quote_id)
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
    console.error('[updateVendorQuote] Update error:', error);
    return { success: false, error: 'Failed to update vendor quote' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'vendor_quote',
    entity_id: vendor_quote_id,
    action: 'updated',
    description: `Vendor quote updated for quotation ${existingQuote.quotation.quotation_ref}`,
    owner_id: authContext.userId,
    old_values: { ...existingQuote },
    new_values: { ...data },
  });

  return {
    success: true,
    vendorQuote: data as VendorQuote,
  };
}