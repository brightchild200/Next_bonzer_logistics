'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Consignee, ConsigneeInput, CreateConsigneePartyResult } from './types';

export type CreateConsigneeResult =
  | {
      success: true;
      consignee: Consignee;
      warnings: ConsigneeDuplicateWarning[];
      partyResult: CreateConsigneePartyResult;
    }
  | {
      success: false;
      error: string;
    };

export type ConsigneeDuplicateWarningType =
  | 'email'
  | 'phone'
  | 'company_name'
  | 'pan'
  | 'exact_company_name';

export interface ConsigneeDuplicateWarning {
  type: ConsigneeDuplicateWarningType;
  consignee_id: string;
  consignee_ref: string;
  company_name: string;
  message: string;
}

function normalizeOptional(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeGst(value?: string): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function normalizePan(value?: string): string | null {
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

export async function createConsignee(
  input: ConsigneeInput
): Promise<CreateConsigneeResult> {
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

  const warnings: ConsigneeDuplicateWarning[] = [];

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('gst_number', gstNumber)
      .maybeSingle();

    if (gstCheckError) {
      return { success: false, error: 'Failed to validate GST number' };
    }

    if (gstDuplicate) {
      return {
        success: false,
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.consignee_ref})`,
      };
    }
  }

  const { data: allConsigneesForExactCheck, error: exactNameCheckError } = await supabase
    .from('consignees')
    .select('id, consignee_ref, company_name');

  if (exactNameCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allConsigneesForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedCompanyNameForComparison
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.consignee_ref})`,
    };
  }

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('pan_number', panNumber)
      .maybeSingle();

    if (panCheckError) {
      return { success: false, error: 'Failed to validate PAN' };
    }

    if (panDuplicate) {
      return {
        success: false,
        error: `PAN already exists for ${panDuplicate.company_name} (${panDuplicate.consignee_ref})`,
      };
    }
  }

  if (email) {
    const { data: emailDuplicates, error: emailCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('email', email);

    if (emailCheckError) {
      return { success: false, error: 'Failed to validate consignee email' };
    }

    for (const consignee of emailDuplicates ?? []) {
      warnings.push({
        type: 'email',
        consignee_id: consignee.id,
        consignee_ref: consignee.consignee_ref,
        company_name: consignee.company_name,
        message: `Email already exists for ${consignee.company_name} (${consignee.consignee_ref})`,
      });
    }
  }

  if (phone) {
    const { data: phoneDuplicates, error: phoneCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('phone', phone);

    if (phoneCheckError) {
      return { success: false, error: 'Failed to validate consignee phone' };
    }

    for (const consignee of phoneDuplicates ?? []) {
      warnings.push({
        type: 'phone',
        consignee_id: consignee.id,
        consignee_ref: consignee.consignee_ref,
        company_name: consignee.company_name,
        message: `Phone already exists for ${consignee.company_name} (${consignee.consignee_ref})`,
      });
    }
  }

  const { data: companyCandidates, error: companyCheckError } =
    await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .ilike('company_name', `%${companyName}%`)
      .limit(10);

  if (companyCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const consignee of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(consignee.company_name);
    if (candidateNormalized === normalizedCompanyNameForComparison) {
      continue;
    }
    warnings.push({
      type: 'company_name',
      consignee_id: consignee.id,
      consignee_ref: consignee.consignee_ref,
      company_name: consignee.company_name,
      message: `Similar consignee already exists: ${consignee.company_name} (${consignee.consignee_ref})`,
    });
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'create_consignee',
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
    console.error('[createConsignee] RPC error:', rpcError);
    const errorMessage = rpcError.message;
    if (errorMessage.includes('Invalid PAN format') || errorMessage.includes('Invalid GSTIN format') || errorMessage.includes('does not match provided PAN')) {
      return { success: false, error: errorMessage };
    }
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      if (errorMessage.includes('consignees_gst_number')) {
        return { success: false, error: 'GST number already exists' };
      }
      return { success: false, error: 'A consignee with this unique information already exists' };
    }
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }
    return { success: false, error: errorMessage };
  }

  const partyResult = rpcResult as CreateConsigneePartyResult;

  const { data: consigneeData, error: consigneeFetchError } = await supabase
    .from('consignees')
    .select(
      `
      id,
      consignee_ref,
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
    .eq('consignee_ref', partyResult.consignee_ref)
    .single();

  if (consigneeFetchError || !consigneeData) {
    console.error('[createConsignee] Failed to fetch created consignee:', consigneeFetchError);
    return { success: false, error: 'Consignee created but failed to fetch details' };
  }

  return {
    success: true,
    consignee: consigneeData as Consignee,
    warnings,
    partyResult,
  };
}