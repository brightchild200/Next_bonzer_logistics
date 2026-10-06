'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, CreateEnquiryInput } from './types';

export type CreateEnquiryResult =
  | {
      success: true;
      enquiry: EnquiryWorkflowRecord;
    }
  | {
      success: false;
      error: string;
    };

export async function createEnquiry(
  input: CreateEnquiryInput
): Promise<CreateEnquiryResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.ENQUIRY.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const {
    reference,
    customer_id,
    customer_name,
    origin,
    destination,
    pol_id,
    pod_id,
    mode,
    cargo_type,
    weight_kg,
    volume_cbm,
    incoterm,
    expected_shipment_date,
    notes,
    status,
    shipper_id,
    consignee_id,
  } = input;

  if (!reference?.trim()) {
    return { success: false, error: 'Reference is required' };
  }

  if (!customer_id && !customer_name?.trim()) {
    return { success: false, error: 'Customer is required' };
  }

  // Validate POL if provided
  let polName = origin?.trim() || null;
  let polCountry = null;
  if (pol_id) {
    const { data: pol, error: polError } = await supabase
      .from('port_master')
      .select('name, country_id, countries(name)')
      .eq('id', pol_id)
      .eq('location_type', 'SEA')
      .maybeSingle();

    if (polError) {
      return { success: false, error: 'Failed to validate POL' };
    }
    if (!pol) {
      return { success: false, error: 'POL not found' };
    }
    polName = pol.name;
    polCountry = (pol.countries as any)?.[0]?.name || null;
  }

  // Validate POD if provided
  let podName = destination?.trim() || null;
  let podCountry = null;
  if (pod_id) {
    const { data: pod, error: podError } = await supabase
      .from('port_master')
      .select('name, country_id, countries(name)')
      .eq('id', pod_id)
      .eq('location_type', 'SEA')
      .maybeSingle();

    if (podError) {
      return { success: false, error: 'Failed to validate POD' };
    }
    if (!pod) {
      return { success: false, error: 'POD not found' };
    }
    podName = pod.name;
    podCountry = (pod.countries as any)?.[0]?.name || null;
  }

  // If no POL/POD IDs provided, require origin/destination as fallback
  if (!pol_id && !polName) {
    return { success: false, error: 'Origin (POL) is required' };
  }
  if (!pod_id && !podName) {
    return { success: false, error: 'Destination (POD) is required' };
  }

  if (shipper_id !== undefined && shipper_id !== null && shipper_id.trim() !== '') {
    const { data: shipper, error: shipperError } = await supabase
      .from('shippers')
      .select('id')
      .eq('id', shipper_id)
      .maybeSingle();

    if (shipperError) {
      return { success: false, error: 'Failed to validate shipper' };
    }
    if (!shipper) {
      return { success: false, error: 'Shipper not found' };
    }
  }

  if (consignee_id !== undefined && consignee_id !== null && consignee_id.trim() !== '') {
    const { data: consignee, error: consigneeError } = await supabase
      .from('consignees')
      .select('id')
      .eq('id', consignee_id)
      .maybeSingle();

    if (consigneeError) {
      return { success: false, error: 'Failed to validate consignee' };
    }
    if (!consignee) {
      return { success: false, error: 'Consignee not found' };
    }
  }

  const payload = {
    owner_id: authContext.userId,
    reference: reference.trim(),
    customer_id: customer_id || null,
    customer_name: customer_name?.trim() || null,
    origin: polName,
    destination: podName,
    pol_id: pol_id?.trim() || null,
    pod_id: pod_id?.trim() || null,
    mode: mode ?? 'sea',
    cargo_type: cargo_type?.trim() || null,
    weight_kg: weight_kg !== undefined && weight_kg !== null ? parseFloat(String(weight_kg)) : null,
    volume_cbm: volume_cbm !== undefined && volume_cbm !== null ? parseFloat(String(volume_cbm)) : null,
    incoterm: incoterm?.trim() || null,
    expected_shipment_date: expected_shipment_date || null,
    notes: notes?.trim() || null,
    status: status ?? 'new',
    shipper_id: shipper_id?.trim() || null,
    consignee_id: consignee_id?.trim() || null,
  };

  const { data, error } = await supabase
    .from('enquiries')
    .insert(payload)
    .select(
      `
      id,
      owner_id,
      reference,
      customer_id,
      customer_name,
      origin,
      destination,
      pol_id,
      pod_id,
      mode,
      cargo_type,
      weight_kg,
      volume_cbm,
      incoterm,
      status,
      expected_shipment_date,
      notes,
      assigned_customer_service_id,
      assigned_by,
      assigned_at,
      quoted_at,
      won_at,
      lost_at,
      archived_at,
      closed_by,
      shipper_id,
      consignee_id,
      created_at,
      updated_at
      `
    )
    .single();

  if (error) {
    return { success: false, error: 'Failed to create enquiry' };
  }

  // Log activity
  await supabase.from('activity_log').insert({
    entity_type: 'enquiry',
    action: 'Created new enquiry',
    description: `${payload.reference} → ${payload.origin} → ${payload.destination}`,
    owner_id: authContext.userId,
  });

  return {
    success: true,
    enquiry: data as EnquiryWorkflowRecord,
  };
}