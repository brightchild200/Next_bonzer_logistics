'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext } from '@/lib/auth/server-auth';
import { startTimer, logPerfEnd, generateTraceId } from '@/lib/perf/timing';

export interface ShipmentFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ShipmentRow {
  id: string;
  reference: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  mode: string;
  carrier: string | null;
  status: string;
  eta: string | null;
  value: number;
  currency: string;
  created_at: string;
}

export interface GetShipmentsResult {
  success: true;
  shipments: ShipmentRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetShipmentsError {
  success: false;
  error: string;
}

export type GetShipmentsResponse = GetShipmentsResult | GetShipmentsError;

export async function getShipments(
  filters: ShipmentFilters = {}
): Promise<GetShipmentsResponse> {
  const traceId = generateTraceId();
  const totalStart = startTimer();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    logPerfEnd(traceId, 'getShipments total (unauthorized)', totalStart);
    return authResult;
  }

  const supabase = createClient();

  const limit = Math.min(Math.max(filters.limit ?? 10, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const queryStart = startTimer();
  let query = supabase
    .from('shipments')
    .select(
      `
      id,
      reference,
      customer_name,
      origin,
      destination,
      mode,
      carrier,
      status,
      eta,
      value,
      currency,
      created_at
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  logPerfEnd(traceId, 'shipment query', queryStart);

  if (error) {
    logPerfEnd(traceId, 'getShipments total (query error)', totalStart);
    return { success: false, error: 'Failed to fetch shipments' };
  }

  logPerfEnd(traceId, 'getShipments total', totalStart);

  return {
    success: true,
    shipments: (data ?? []) as ShipmentRow[],
    total: count ?? 0,
    limit,
    offset,
  };
}