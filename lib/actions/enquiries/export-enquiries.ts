'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryStatus } from './types';

export interface ExportEnquiriesFilters {
  search?: string;
  status?: EnquiryStatus | 'all';
  mode?: string;
  from?: string;
  to?: string;
}

interface EnquiryExportRow {
  id: string;
  reference: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  mode: string;
  cargo_type: string | null;
  weight_kg: number | null;
  volume_cbm: number | null;
  incoterm: string | null;
  status: string;
  expected_shipment_date: string | null;
  created_at: string;
}

export interface ExportEnquiriesResult {
  success: true;
  rows: EnquiryExportRow[];
}

export interface ExportEnquiriesError {
  success: false;
  error: string;
}

export type ExportEnquiriesResponse = ExportEnquiriesResult | ExportEnquiriesError;

export async function exportEnquiries(
  filters: ExportEnquiriesFilters = {}
): Promise<ExportEnquiriesResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  const canReadAll = hasPermission(authContext, PERMISSIONS.ADMIN.USER_READ);
  const canReadTeam = hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_TEAM);
  const canReadAssigned = hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ASSIGNED);
  const canReadOwn = hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_OWN);

  if (!canReadAll && !canReadTeam && !canReadAssigned && !canReadOwn) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabase = createClient();

  let query = supabase
    .from('enquiries')
    .select(
      `
      id,
      reference,
      customer_name,
      origin,
      destination,
      mode,
      cargo_type,
      weight_kg,
      volume_cbm,
      incoterm,
      status,
      expected_shipment_date,
      created_at
      `
    )
    .order('created_at', { ascending: false });

  if (canReadOwn && !canReadTeam && !canReadAssigned && !canReadAll) {
    query = query.eq('owner_id', authContext.userId);
  }

  if (filters.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
    );
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.mode && filters.mode !== 'all') {
    query = query.eq('mode', filters.mode);
  }

  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }

  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { data, error } = await query.range(0, 9999);

  if (error) {
    console.error('[exportEnquiries] Query error:', error);
    return { success: false, error: 'Failed to fetch enquiries for export' };
  }

  return {
    success: true,
    rows: (data ?? []) as EnquiryExportRow[],
  };
}