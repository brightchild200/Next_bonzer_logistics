'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Consignee, ConsigneeDuplicateWarning, UpdateConsigneeInput } from './types';

export type UpdateConsigneeResult =
  | {
      success: true;
      consignee: Consignee;
      warnings: ConsigneeDuplicateWarning[];
    }
  | {
      success: false;
      error: string;
    };

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

export async function updateConsignee(
  input: UpdateConsigneeInput
): Promise<UpdateConsigneeResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.UPDATE)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const consigneeId = input.consignee_id?.trim();
  const companyName = normalizeCompanyName(input.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!consigneeId) {
    return {
      success: false,
      error: 'consignee_id is required',
    };
  }

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

  const { data: existingConsignee, error: existingConsigneeError } =
    await supabase
      .from('consignees')
      .select('id')
      .eq('id', consigneeId)
      .maybeSingle();

  if (existingConsigneeError) {
    console.error('Existing consignee lookup error:', existingConsigneeError);
    return {
      success: false,
      error: 'Failed to validate consignee',
    };
  }

  if (!existingConsignee) {
    return {
      success: false,
      error: 'Consignee not found',
    };
  }

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('gst_number', gstNumber)
      .neq('id', consigneeId)
      .maybeSingle();

    if (gstCheckError) {
      console.error('GST duplicate check error:', gstCheckError);
      return {
        success: false,
        error: 'Failed to validate GST number',
      };
    }

    if (gstDuplicate) {
      return {
        success: false,
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.consignee_ref})`,
      };
    }
  }

  const normalizedNameForExactMatch = normalizeCompanyNameForComparison(companyName);

  const { data: allConsigneesForExactCheck, error: exactNameCheckError } = await supabase
    .from('consignees')
    .select('id, consignee_ref, company_name')
    .neq('id', consigneeId);

  if (exactNameCheckError) {
    console.error('Exact company name check error:', exactNameCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allConsigneesForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedNameForExactMatch
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.consignee_ref})`,
    };
  }

  const warnings: ConsigneeDuplicateWarning[] = [];

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('consignees')
      .select('id, consignee_ref, company_name')
      .eq('pan_number', panNumber)
      .neq('id', consigneeId)
      .maybeSingle();

    if (panCheckError) {
      console.error('PAN duplicate check error:', panCheckError);
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
    const { data: emailDuplicates, error: emailCheckError } =
      await supabase
        .from('consignees')
        .select('id, consignee_ref, company_name')
        .eq('email', email)
        .neq('id', consigneeId);

    if (emailCheckError) {
      console.error('Email duplicate check error:', emailCheckError);
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
    const { data: phoneDuplicates, error: phoneCheckError } =
      await supabase
        .from('consignees')
        .select('id, consignee_ref, company_name')
        .eq('phone', phone)
        .neq('id', consigneeId);

    if (phoneCheckError) {
      console.error('Phone duplicate check error:', phoneCheckError);
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
      .neq('id', consigneeId)
      .limit(10);

  if (companyCheckError) {
    console.error('Company duplicate check error:', companyCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const consignee of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(consignee.company_name);
    if (candidateNormalized === normalizedNameForExactMatch) {
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

  const { data, error } = await supabase
    .from('consignees')
    .update({
      company_name: companyName,
      contact_person: normalizeOptional(input.contact_person),
      email,
      phone,
      address: normalizeOptional(input.address),
      city: normalizeOptional(input.city),
      state: normalizeOptional(input.state),
      country: normalizeOptional(input.country) ?? 'India',
      pincode: normalizeOptional(input.pincode),
      gst_number: gstNumber,
      pan_number: panNumber,
    })
    .eq('id', consigneeId)
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
    .single();

  if (error) {
    console.error('Update consignee error:', error);
    if (error.code === '23505') {
      return {
        success: false,
        error: 'A consignee with this unique information already exists',
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    consignee: data as Consignee,
    warnings,
  };
}