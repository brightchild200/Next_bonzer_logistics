'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Shipper, ShipperInput, CreateShipperPartyResult } from './types';

export type CreateShipperResult =
  | {
      success: true;
      shipper: Shipper;
      warnings: ShipperDuplicateWarning[];
      partyResult: CreateShipperPartyResult;
    }
  | {
      success: false;
      error: string;
    };

export type ShipperDuplicateWarningType =
  | 'email'
  | 'phone'
  | 'company_name'
  | 'pan'
  | 'exact_company_name';

export interface ShipperDuplicateWarning {
  type: ShipperDuplicateWarningType;
  shipper_id: string;
  shipper_ref: string;
  company_name: string;
  message: string;
}

function normalizeOptional(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeGst(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function normalizePan(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function normalizeCompanyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeCompanyNameForComparison(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function validateEmailFormat(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

function validatePhoneFormat(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Invalid phone number. Expected 10-15 digits';
  }
  return null;
}

function validatePanFormat(pan: string): string | null {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(pan)) {
    return 'Invalid PAN format. Expected: AAAAA9999A';
  }
  return null;
}

function validateGstinFormat(gstin: string): string | null {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
  if (!gstinRegex.test(gstin)) {
    return 'Invalid GSTIN format. Expected 15-character GSTIN';
  }
  return null;
}

function validatePanGstMatch(pan: string, gstin: string): string | null {
  const panInGstin = gstin.substring(2, 12);
  if (panInGstin !== pan) {
    return 'PAN in GSTIN (positions 3-12) does not match provided PAN';
  }
  return null;
}

export async function createShipper(
  input: ShipperInput
): Promise<CreateShipperResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.CREATE)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const companyName = normalizeCompanyName(input.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!companyName) {
    return {
      success: false,
      error: 'Company name is required',
    };
  }

  const email = normalizeEmail(input.email);
  const phone = normalizeOptional(input.phone);
  const gstNumber = normalizeGst(input.gst_number);
  const panNumber = normalizePan(input.pan_number);

  if (email) {
    const emailError = validateEmailFormat(email);
    if (emailError) {
      return { success: false, error: emailError };
    }
  }

  if (phone) {
    const phoneError = validatePhoneFormat(phone);
    if (phoneError) {
      return { success: false, error: phoneError };
    }
  }

  if (panNumber) {
    const panError = validatePanFormat(panNumber);
    if (panError) {
      return { success: false, error: panError };
    }
  }

  if (gstNumber) {
    const gstinError = validateGstinFormat(gstNumber);
    if (gstinError) {
      return { success: false, error: gstinError };
    }
  }

  if (panNumber && gstNumber) {
    const matchError = validatePanGstMatch(panNumber, gstNumber);
    if (matchError) {
      return { success: false, error: matchError };
    }
  }

  const warnings: ShipperDuplicateWarning[] = [];

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('gst_number', gstNumber)
      .maybeSingle();

    if (gstCheckError) {
      return { success: false, error: 'Failed to validate GST number' };
    }

    if (gstDuplicate) {
      return {
        success: false,
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.shipper_ref})`,
      };
    }
  }

  const { data: allShippersForExactCheck, error: exactNameCheckError } = await supabase
    .from('shippers')
    .select('id, shipper_ref, company_name');

  if (exactNameCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allShippersForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedCompanyNameForComparison
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.shipper_ref})`,
    };
  }

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('pan_number', panNumber)
      .maybeSingle();

    if (panCheckError) {
      return { success: false, error: 'Failed to validate PAN' };
    }

    if (panDuplicate) {
      return {
        success: false,
        error: `PAN already exists for ${panDuplicate.company_name} (${panDuplicate.shipper_ref})`,
      };
    }
  }

  if (email) {
    const { data: emailDuplicates, error: emailCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('email', email);

    if (emailCheckError) {
      return { success: false, error: 'Failed to validate shipper email' };
    }

    for (const shipper of emailDuplicates ?? []) {
      warnings.push({
        type: 'email',
        shipper_id: shipper.id,
        shipper_ref: shipper.shipper_ref,
        company_name: shipper.company_name,
        message: `Email already exists for ${shipper.company_name} (${shipper.shipper_ref})`,
      });
    }
  }

  if (phone) {
    const { data: phoneDuplicates, error: phoneCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('phone', phone);

    if (phoneCheckError) {
      return { success: false, error: 'Failed to validate shipper phone' };
    }

    for (const shipper of phoneDuplicates ?? []) {
      warnings.push({
        type: 'phone',
        shipper_id: shipper.id,
        shipper_ref: shipper.shipper_ref,
        company_name: shipper.company_name,
        message: `Phone already exists for ${shipper.company_name} (${shipper.shipper_ref})`,
      });
    }
  }

  const { data: companyCandidates, error: companyCheckError } =
    await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .ilike('company_name', `%${companyName}%`)
      .limit(10);

  if (companyCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const shipper of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(shipper.company_name);
    if (candidateNormalized === normalizedCompanyNameForComparison) {
      continue;
    }
    warnings.push({
      type: 'company_name',
      shipper_id: shipper.id,
      shipper_ref: shipper.shipper_ref,
      company_name: shipper.company_name,
      message: `Similar shipper already exists: ${shipper.company_name} (${shipper.shipper_ref})`,
    });
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'create_shipper',
    {
      p_company_name: companyName,
      p_contact_person: normalizeOptional(input.contact_person),
      p_email: email,
      p_phone: phone,
      p_address: normalizeOptional(input.address),
      p_city: normalizeOptional(input.city),
      p_state: normalizeOptional(input.state),
      p_country: normalizeOptional(input.country) ?? 'India',
      p_pincode: normalizeOptional(input.pincode),
      p_gst_number: gstNumber,
      p_pan_number: panNumber,
      p_source_customer_id: input.source_customer_id,
    }
  );

  if (rpcError) {
    console.error('[createShipper] RPC error:', rpcError);
    const errorMessage = rpcError.message;
    if (errorMessage.includes('Invalid PAN format') || errorMessage.includes('Invalid GSTIN format') || errorMessage.includes('does not match provided PAN')) {
      return { success: false, error: errorMessage };
    }
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      if (errorMessage.includes('shippers_gst_number')) {
        return { success: false, error: 'GST number already exists' };
      }
      return { success: false, error: 'A shipper with this unique information already exists' };
    }
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }
    return { success: false, error: errorMessage };
  }

  const partyResult = rpcResult as CreateShipperPartyResult;

  const { data: shipperData, error: shipperFetchError } = await supabase
    .from('shippers')
    .select(
      `
      id,
      shipper_ref,
      source_customer_id,
      company_name,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      gst_number,
      pan_number,
      is_active,
      created_by,
      created_at,
      updated_at
      `
    )
    .eq('shipper_ref', partyResult.shipper_ref)
    .single();

  if (shipperFetchError || !shipperData) {
    console.error('[createShipper] Failed to fetch created shipper:', shipperFetchError);
    return { success: false, error: 'Shipper created but failed to fetch details' };
  }

  return {
    success: true,
    shipper: shipperData as Shipper,
    warnings,
    partyResult,
  };
}