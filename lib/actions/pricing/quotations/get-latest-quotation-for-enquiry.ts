'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Quotation, QuotationWithItems, QuotationItem } from '../types';

export type GetLatestQuotationForEnquiryResult =
  | {
      success: true;
      quotation: QuotationWithItems | null;
    }
  | {
      success: false;
      error: string;
    };

export async function getLatestQuotationForEnquiry(enquiryId: string): Promise<GetLatestQuotationForEnquiryResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!enquiryId?.trim()) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  const { data: latestQuotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('enquiry_id', enquiryId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (quotationError) {
    console.error('[getLatestQuotationForEnquiry] Error:', quotationError);
    return { success: false, error: 'Failed to fetch latest quotation' };
  }

  if (!latestQuotation) {
    return { success: true, quotation: null };
  }

  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
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
    .eq('quotation_id', latestQuotation.id)
    .order('sort_order');

  if (itemsError) {
    console.error('[getLatestQuotationForEnquiry] Items fetch error:', itemsError);
    return { success: false, error: 'Failed to fetch quotation items' };
  }

  return {
    success: true,
    quotation: {
      ...latestQuotation,
      items: (items ?? []) as QuotationItem[],
    } as QuotationWithItems,
  };
}