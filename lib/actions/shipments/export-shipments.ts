'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext } from '@/lib/auth/server-auth';

export interface ExportShipmentsFilters {
  search?: string;
  from?: string;
  to?: string;
}

export interface ShipmentExportRow {
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

export interface ExportShipmentsResult {
  success: true;
  rows: ShipmentExportRow[];
}

export interface ExportShipmentsError {
  success: false;
  error: string;
}

export type ExportShipmentsResponse = ExportShipmentsResult | ExportShipmentsError;

export async function exportShipments(
  filters: ExportShipmentsFilters = {}
): Promise<ExportShipmentsResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const supabase = createClient();

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
      `
    )
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
    );
  }

  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }

  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { data, error } = await query.range(0, 9999);

  if (error) {
    console.error('[exportShipments] Query error:', error);
    return { success: false, error: 'Failed to fetch shipments for export' };
  }

  return {
    success: true,
    rows: (data ?? []) as ShipmentExportRow[],
  };
}