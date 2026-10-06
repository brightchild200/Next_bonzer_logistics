'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  DeleteQuotationItemResult,
  QuotationStatus,
} from '../types';

const RESTRICTED_STATUSES_FOR_VENDOR_QUOTES: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function deleteVendorQuote(vendorQuoteId: string): Promise<DeleteQuotationItemResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.MANAGE_VENDOR_QUOTES)) {
    return { success: false, error: 'Insufficient permissions to manage vendor quotes' };
  }

  if (!vendorQuoteId?.trim()) {
    return { success: false, error: 'Vendor Quote ID is required' };
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
      )
    `
    )
    .eq('id', vendorQuoteId)
    .maybeSingle();

  if (quoteError) {
    console.error('[deleteVendorQuote] Fetch error:', quoteError);
    return { success: false, error: 'Failed to fetch vendor quote' };
  }

  if (!existingQuote) {
    return { success: false, error: 'Vendor quote not found' };
  }

  if (RESTRICTED_STATUSES_FOR_VENDOR_QUOTES.includes(existingQuote.quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot delete vendor quotes for quotation in '${existingQuote.quotation.status}' state` };
  }

  const { error: deleteError } = await supabase
    .from('vendor_quotes')
    .delete()
    .eq('id', vendorQuoteId);

  if (deleteError) {
    console.error('[deleteVendorQuote] Delete error:', deleteError);
    return { success: false, error: 'Failed to delete vendor quote' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'vendor_quote',
    entity_id: vendorQuoteId,
    action: 'deleted',
    description: `Vendor quote deleted from quotation ${existingQuote.quotation.quotation_ref}`,
    owner_id: authContext.userId,
    old_values: { ...existingQuote },
  });

  return { success: true };
}