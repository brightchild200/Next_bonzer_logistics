'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc(
    'get_my_auth_context'
  );

  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.ENQUIRY.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const {
    reference,
    customer_id,
    customer_name,
    origin,
    destination,
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

  if (!origin?.trim() || !destination?.trim()) {
    return { success: false, error: 'Origin and destination are required' };
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
    owner_id: user.id,
    reference: reference.trim(),
    customer_id: customer_id || null,
    customer_name: customer_name?.trim() || null,
    origin: origin.trim(),
    destination: destination.trim(),
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
    description: `${payload.reference} — ${payload.origin} → ${payload.destination}`,
    owner_id: user.id,
  });

  return {
    success: true,
    enquiry: data as EnquiryWorkflowRecord,
  };
}