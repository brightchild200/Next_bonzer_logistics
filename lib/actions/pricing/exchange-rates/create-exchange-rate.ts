'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  ExchangeRate,
  CreateExchangeRateInput,
  CreateExchangeRateResult,
} from '../types';
import { validateExchangeRateInput } from '../validations';

const VALID_SOURCES = ['manual', 'rbi', 'api'] as const;

export async function createExchangeRate(input: CreateExchangeRateInput): Promise<CreateExchangeRateResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.MANAGE_EXCHANGE_RATES)) {
    return { success: false, error: 'Insufficient permissions to manage exchange rates' };
  }

  const validationError = validateExchangeRateInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { data, error } = await supabase.rpc('upsert_exchange_rate', {
    p_base_currency: input.base_currency.toUpperCase(),
    p_quote_currency: input.quote_currency.toUpperCase(),
    p_rate: input.rate,
    p_effective_date: input.effective_date,
    p_source: input.source || 'manual',
  });

  if (error) {
    console.error('[createExchangeRate] RPC error:', error);
    const errorMessage = error.message;
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }
    return { success: false, error: errorMessage };
  }

  const newRate = data as ExchangeRate;

  await supabase.from('activity_log').insert({
    entity_type: 'exchange_rate',
    entity_id: newRate.id,
    action: 'created',
    description: `Exchange rate ${newRate.base_currency}/${newRate.quote_currency} = ${newRate.rate} created`,
    owner_id: authContext.userId,
    new_values: { ...newRate },
  });

  return {
    success: true,
    exchangeRate: newRate,
  };
}