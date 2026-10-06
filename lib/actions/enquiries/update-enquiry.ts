'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { EnquiryWorkflowRecord, UpdateEnquiryInput } from './types';

export type UpdateEnquiryResult =
  | {
      success: true;
      enquiry: EnquiryWorkflowRecord;
    }
  | {
      success: false;
      error: string;
    };

export async function updateEnquiry(
  input: UpdateEnquiryInput
): Promise<UpdateEnquiryResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.ENQUIRY.UPDATE_SALES_FIELDS)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const enquiryId = input.id?.trim();
  if (!enquiryId) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  const { data: existingEnquiry, error: fetchError } = await supabase
    .from('enquiries')
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
    .eq('id', enquiryId)
    .single();

  if (fetchError || !existingEnquiry) {
    return { success: false, error: 'Enquiry not found' };
  }

  if (existingEnquiry.status === 'archived') {
    return { success: false, error: 'Archived enquiries cannot be updated' };
  }

  const isOwner = existingEnquiry.owner_id === authContext.userId;
  const hasReadAll = userPermissions.includes(PERMISSIONS.ENQUIRY.READ_ALL);
  const hasReadTeam = userPermissions.includes(PERMISSIONS.ENQUIRY.READ_TEAM);

  let authorized = false;

  if (hasReadAll) {
    authorized = true;
  } else if (isOwner) {
    authorized = true;
  } else if (hasReadTeam) {
    const { data: teamOwners, error: teamError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id)
      .neq('user_id', authContext.userId);

    if (!teamError && teamOwners) {
      const teamOwnerIds = teamOwners.map((t) => t.user_id);
      authorized = teamOwnerIds.includes(existingEnquiry.owner_id);
    }
  }

  if (!authorized) {
    return { success: false, error: 'You are not authorized to update this enquiry' };
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
    shipper_id,
    consignee_id,
  } = input;

  if (reference !== undefined && !reference?.trim()) {
    return { success: false, error: 'Reference cannot be empty' };
  }

  // Validate POL if provided
  let polName = origin?.trim() || null;
  if (pol_id !== undefined && pol_id !== null && pol_id.trim() !== '') {
    const { data: pol, error: polError } = await supabase
      .from('port_master')
      .select('name')
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
  }

  // Validate POD if provided
  let podName = destination?.trim() || null;
  if (pod_id !== undefined && pod_id !== null && pod_id.trim() !== '') {
    const { data: pod, error: podError } = await supabase
      .from('port_master')
      .select('name')
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
  }

  // If neither POL/POD ID nor name is provided, check existing
  if (origin !== undefined && !pol_id && !polName) {
    return { success: false, error: 'Origin cannot be empty' };
  }

  if (destination !== undefined && !pod_id && !podName) {
    return { success: false, error: 'Destination cannot be empty' };
  }

  if (customer_id === undefined && customer_name !== undefined && !customer_name?.trim()) {
    if (!existingEnquiry.customer_id && !existingEnquiry.customer_name) {
      return { success: false, error: 'Customer is required' };
    }
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

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (reference !== undefined) updatePayload.reference = reference.trim();
  if (customer_id !== undefined) updatePayload.customer_id = customer_id || null;
  if (customer_name !== undefined) updatePayload.customer_name = customer_name?.trim() || null;
  if (pol_id !== undefined) updatePayload.pol_id = pol_id?.trim() || null;
  if (pod_id !== undefined) updatePayload.pod_id = pod_id?.trim() || null;
  if (origin !== undefined || polName !== null) updatePayload.origin = polName;
  if (destination !== undefined || podName !== null) updatePayload.destination = podName;
  if (mode !== undefined) updatePayload.mode = mode ?? 'sea';
  if (cargo_type !== undefined) updatePayload.cargo_type = cargo_type?.trim() || null;
  if (weight_kg !== undefined) {
    updatePayload.weight_kg = weight_kg !== null && weight_kg !== undefined ? parseFloat(String(weight_kg)) : null;
  }
  if (volume_cbm !== undefined) {
    updatePayload.volume_cbm = volume_cbm !== null && volume_cbm !== undefined ? parseFloat(String(volume_cbm)) : null;
  }
  if (incoterm !== undefined) updatePayload.incoterm = incoterm?.trim() || null;
  if (expected_shipment_date !== undefined) updatePayload.expected_shipment_date = expected_shipment_date || null;
  if (notes !== undefined) updatePayload.notes = notes?.trim() || null;
  if (shipper_id !== undefined) updatePayload.shipper_id = shipper_id?.trim() || null;
  if (consignee_id !== undefined) updatePayload.consignee_id = consignee_id?.trim() || null;

  const { data: updatedEnquiry, error: updateError } = await supabase
    .from('enquiries')
    .update(updatePayload)
    .eq('id', enquiryId)
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

  if (updateError || !updatedEnquiry) {
    return { success: false, error: 'Failed to update enquiry' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'enquiry',
    entity_id: enquiryId,
    action: 'Updated enquiry',
    description: `${updatedEnquiry.reference} — ${updatedEnquiry.origin} → ${updatedEnquiry.destination}`,
    owner_id: authContext.userId,
  });

  return {
    success: true,
    enquiry: updatedEnquiry as EnquiryWorkflowRecord,
  };
}