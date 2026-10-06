'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { ExchangeRate } from '../types';

export type GetExchangeRateResult =
  | {
      success: true;
      exchangeRate: ExchangeRate;
    }
  | {
      success: false;
      error: string;
    };

export async function getExchangeRate(exchangeRateId: string): Promise<GetExchangeRateResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!exchangeRateId?.trim()) {
    return { success: false, error: 'Exchange Rate ID is required' };
  }

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('id', exchangeRateId)
    .maybeSingle();

  if (error) {
    console.error('[getExchangeRate] Error:', error);
    return { success: false, error: 'Failed to fetch exchange rate' };
  }

  if (!data) {
    return { success: false, error: 'Exchange rate not found' };
  }

  return {
    success: true,
    exchangeRate: data as ExchangeRate,
  };
}