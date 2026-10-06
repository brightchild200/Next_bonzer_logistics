'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  ExchangeRate,
  ListExchangeRatesParams,
  ListExchangeRatesResponse,
  ListExchangeRatesResult,
  ListExchangeRatesError,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = ['base_currency', 'quote_currency', 'rate', 'effective_date', 'created_at'] as const;
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;

export async function listExchangeRates(params: ListExchangeRatesParams = {}): Promise<ListExchangeRatesResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const sortBy = ALLOWED_SORT_FIELDS.includes(params.sortBy as any)
    ? params.sortBy!
    : 'effective_date';
  const sortOrder = ALLOWED_SORT_ORDERS.includes(params.sortOrder ?? 'desc')
    ? params.sortOrder
    : 'desc';

  let query = supabase.from('exchange_rates').select('*', { count: 'exact' });

  if (params.baseCurrency) {
    query = query.eq('base_currency', params.baseCurrency.toUpperCase());
  }

  if (params.quoteCurrency) {
    query = query.eq('quote_currency', params.quoteCurrency.toUpperCase());
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[listExchangeRates] Error:', error);
    return { success: false, error: 'Failed to fetch exchange rates' };
  }

  return {
    success: true,
    exchangeRates: (data ?? []) as ExchangeRate[],
    totalCount: count ?? 0,
    limit: pageSize,
    offset,
  };
}