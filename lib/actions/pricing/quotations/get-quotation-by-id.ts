'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Quotation } from '../types';

export type GetQuotationByIdResult =
  | {
      success: true;
      quotation: Quotation;
    }
  | {
      success: false;
      error: string;
    };

export async function getQuotationById(quotationId: string): Promise<GetQuotationByIdResult> {
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

  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .maybeSingle();

  if (error) {
    console.error('[getQuotationById] Error:', error);
    return { success: false, error: 'Failed to fetch quotation' };
  }

  if (!data) {
    return { success: false, error: 'Quotation not found' };
  }

  return {
    success: true,
    quotation: data as Quotation,
  };
}