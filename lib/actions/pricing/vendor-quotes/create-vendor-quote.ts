'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  VendorQuote,
  CreateVendorQuoteInput,
  CreateVendorQuoteResult,
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

export async function createVendorQuote(input: CreateVendorQuoteInput): Promise<CreateVendorQuoteResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.MANAGE_VENDOR_QUOTES)) {
    return { success: false, error: 'Insufficient permissions to manage vendor quotes' };
  }

  const validationError = validateVendorQuoteInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { quotation_id, ...quoteData } = input;

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, status, quotation_ref')
    .eq('id', quotation_id)
    .maybeSingle();

  if (quotationError) {
    console.error('[createVendorQuote] Quotation fetch error:', quotationError);
    return { success: false, error: 'Failed to validate quotation' };
  }

  if (!quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  if (RESTRICTED_STATUSES_FOR_VENDOR_QUOTES.includes(quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot add vendor quotes to quotation in '${quotation.status}' state` };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', quoteData.vendor_id)
    .eq('is_active', true)
    .maybeSingle();

  if (vendorError) {
    console.error('[createVendorQuote] Vendor validation error:', vendorError);
    return { success: false, error: 'Failed to validate vendor' };
  }
  if (!vendor) {
    return { success: false, error: 'Vendor not found or inactive' };
  }

  if (quoteData.currency && !isSupportedCurrency(quoteData.currency)) {
    return { success: false, error: `Unsupported currency: ${quoteData.currency}` };
  }

  const insertPayload = {
    quotation_id,
    vendor_id: quoteData.vendor_id,
    vendor_quote_ref: quoteData.vendor_quote_ref?.trim() || null,
    quote_date: quoteData.quote_date
      ? new Date(quoteData.quote_date).toISOString().split('T')[0]
      : null,
    valid_until: quoteData.valid_until
      ? new Date(quoteData.valid_until).toISOString().split('T')[0]
      : null,
    total_amount: quoteData.total_amount ?? null,
    currency: quoteData.currency?.toUpperCase() || 'INR',
    pdf_path: quoteData.pdf_path?.trim() || null,
    notes: quoteData.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('vendor_quotes')
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
    console.error('[createVendorQuote] Insert error:', error);
    return { success: false, error: 'Failed to create vendor quote' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'vendor_quote',
    entity_id: data.id,
    action: 'created',
    description: `Vendor quote added to ${quotation.quotation_ref} from vendor ${data.vendor?.vendor_ref}`,
    owner_id: authContext.userId,
    new_values: { ...data },
  });

  return {
    success: true,
    vendorQuote: data as VendorQuote,
  };
}