'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  ExchangeRate,
  UpdateExchangeRateInput,
  UpdateExchangeRateResult,
} from '../types';
import { validateExchangeRateInput } from '../validations';

const VALID_SOURCES = ['manual', 'rbi', 'api'] as const;

export async function updateExchangeRate(input: UpdateExchangeRateInput): Promise<UpdateExchangeRateResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.MANAGE_EXCHANGE_RATES)) {
    return { success: false, error: 'Insufficient permissions to manage exchange rates' };
  }

  const { exchange_rate_id, ...updateData } = input;

  if (!exchange_rate_id?.trim()) {
    return { success: false, error: 'Exchange Rate ID is required' };
  }

  const validationError = validateExchangeRateInput(updateData);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { data: existingRate, error: fetchError } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('id', exchange_rate_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[updateExchangeRate] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch exchange rate' };
  }

  if (!existingRate) {
    return { success: false, error: 'Exchange rate not found' };
  }

  const { data, error } = await supabase.rpc('upsert_exchange_rate', {
    p_base_currency: updateData.base_currency.toUpperCase(),
    p_quote_currency: updateData.quote_currency.toUpperCase(),
    p_rate: updateData.rate,
    p_effective_date: updateData.effective_date,
    p_source: updateData.source || 'manual',
  });

  if (error) {
    console.error('[updateExchangeRate] RPC error:', error);
    const errorMessage = error.message;
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }
    return { success: false, error: errorMessage };
  }

  const updatedRate = data as ExchangeRate;

  await supabase.from('activity_log').insert({
    entity_type: 'exchange_rate',
    entity_id: updatedRate.id,
    action: 'updated',
    description: `Exchange rate ${updatedRate.base_currency}/${updatedRate.quote_currency} = ${updatedRate.rate} updated`,
    owner_id: authContext.userId,
    old_values: { ...existingRate },
    new_values: { ...updatedRate },
  });

  return {
    success: true,
    exchangeRate: updatedRate,
  };
}