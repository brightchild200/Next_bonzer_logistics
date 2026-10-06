'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  ReorderQuotationItemInput,
  DeleteQuotationItemResult,
  QuotationStatus,
} from '../types';

const RESTRICTED_STATUSES_FOR_ITEMS: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function reorderQuotationItems(
  items: ReorderQuotationItemInput[]
): Promise<DeleteQuotationItemResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'No items provided for reordering' };
  }

  const itemIds = items.map((i) => i.item_id);
  const { data: existingItems, error: fetchError } = await supabase
    .from('quotation_items')
    .select(
      `
      id,
      quotation_id,
      sort_order,
      quotation:quotations!inner (
        id,
        status,
        quotation_ref
      )
    `
    )
    .in('id', itemIds);

  if (fetchError) {
    console.error('[reorderQuotationItems] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch quotation items' };
  }

  if (!existingItems || existingItems.length === 0) {
    return { success: false, error: 'No matching quotation items found' };
  }

  const quotationId = existingItems[0].quotation_id;
  const quotation = Array.isArray(existingItems[0].quotation)
    ? existingItems[0].quotation[0]
    : existingItems[0].quotation;
  const quotationStatus = quotation?.status;
  const quotationRef = quotation?.quotation_ref;

  const updates = items.map((item) => ({
    id: item.item_id,
    sort_order: item.sort_order,
  }));

  const { error: updateError } = await supabase
    .from('quotation_items')
    .upsert(updates, { onConflict: 'id' });

  if (updateError) {
    console.error('[reorderQuotationItems] Update error:', updateError);
    return { success: false, error: 'Failed to reorder quotation items' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: quotationId,
    action: 'items_reordered',
    description: `Items reordered in quotation ${quotationRef}`,
    owner_id: authContext.userId,
    new_values: { items: updates },
  });

  return { success: true };
}