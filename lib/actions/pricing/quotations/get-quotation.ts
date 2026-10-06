'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Quotation, QuotationWithItems, QuotationItem, Vendor } from '../types';

export type GetQuotationResult =
  | {
      success: true;
      quotation: QuotationWithItems;
    }
  | {
      success: false;
      error: string;
    };

export async function getQuotation(quotationId: string): Promise<GetQuotationResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!quotationId?.trim()) {
    return { success: false, error: 'Quotation ID is required' };
  }

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .maybeSingle();

  if (quotationError) {
    console.error('[getQuotation] Quotation fetch error:', quotationError);
    return { success: false, error: 'Failed to fetch quotation' };
  }

  if (!quotation) {
    return { success: false, error: 'Quotation not found' };
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
    .eq('quotation_id', quotationId)
    .order('sort_order');

  if (itemsError) {
    console.error('[getQuotation] Items fetch error:', itemsError);
    return { success: false, error: 'Failed to fetch quotation items' };
  }

  return {
    success: true,
    quotation: {
      ...quotation,
      items: (items ?? []) as QuotationItem[],
    } as QuotationWithItems,
  };
}