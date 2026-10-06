'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  DeleteQuotationItemResult,
  QuotationStatus,
} from '../types';

const RESTRICTED_STATUSES_FOR_ITEMS: QuotationStatus[] = [
  'customer_approved',
  'rejected',
  'expired',
  'cancelled',
];

export async function deleteQuotationItem(itemId: string): Promise<DeleteQuotationItemResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!itemId?.trim()) {
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
        quotation_ref
      )
    `
    )
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    console.error('[deleteQuotationItem] Item fetch error:', itemError);
    return { success: false, error: 'Failed to fetch quotation item' };
  }

  if (!existingItem) {
    return { success: false, error: 'Quotation item not found' };
  }

  if (RESTRICTED_STATUSES_FOR_ITEMS.includes(existingItem.quotation.status as QuotationStatus)) {
    return { success: false, error: `Cannot delete items from quotation in '${existingItem.quotation.status}' state` };
  }

  const { error: deleteError } = await supabase
    .from('quotation_items')
    .delete()
    .eq('id', itemId);

  if (deleteError) {
    console.error('[deleteQuotationItem] Delete error:', deleteError);
    return { success: false, error: 'Failed to delete quotation item' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: existingItem.quotation_id,
    action: 'item_deleted',
    description: `Item "${existingItem.description}" deleted from quotation ${existingItem.quotation.quotation_ref}`,
    owner_id: authContext.userId,
    old_values: { ...existingItem },
  });

  return { success: true };
}