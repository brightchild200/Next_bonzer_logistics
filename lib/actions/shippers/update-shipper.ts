'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Shipper, ShipperDuplicateWarning, UpdateShipperInput } from './types';

export type UpdateShipperResult =
  | {
      success: true;
      shipper: Shipper;
      warnings: ShipperDuplicateWarning[];
    }
  | {
      success: false;
      error: string;
    };

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

export async function updateShipper(
  input: UpdateShipperInput
): Promise<UpdateShipperResult> {
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

  const shipperId = input.shipper_id?.trim();
  const companyName = normalizeCompanyName(input.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!shipperId) {
    return {
      success: false,
      error: 'shipper_id is required',
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

  const { data: existingShipper, error: existingShipperError } =
    await supabase
      .from('shippers')
      .select('id')
      .eq('id', shipperId)
      .maybeSingle();

  if (existingShipperError) {
    console.error('Existing shipper lookup error:', existingShipperError);
    return {
      success: false,
      error: 'Failed to validate shipper',
    };
  }

  if (!existingShipper) {
    return {
      success: false,
      error: 'Shipper not found',
    };
  }

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('gst_number', gstNumber)
      .neq('id', shipperId)
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
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.shipper_ref})`,
      };
    }
  }

  const normalizedNameForExactMatch = normalizeCompanyNameForComparison(companyName);

  const { data: allShippersForExactCheck, error: exactNameCheckError } = await supabase
    .from('shippers')
    .select('id, shipper_ref, company_name')
    .neq('id', shipperId);

  if (exactNameCheckError) {
    console.error('Exact company name check error:', exactNameCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allShippersForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedNameForExactMatch
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.shipper_ref})`,
    };
  }

  const warnings: ShipperDuplicateWarning[] = [];

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('shippers')
      .select('id, shipper_ref, company_name')
      .eq('pan_number', panNumber)
      .neq('id', shipperId)
      .maybeSingle();

    if (panCheckError) {
      console.error('PAN duplicate check error:', panCheckError);
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
    const { data: emailDuplicates, error: emailCheckError } =
      await supabase
        .from('shippers')
        .select('id, shipper_ref, company_name')
        .eq('email', email)
        .neq('id', shipperId);

    if (emailCheckError) {
      console.error('Email duplicate check error:', emailCheckError);
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
    const { data: phoneDuplicates, error: phoneCheckError } =
      await supabase
        .from('shippers')
        .select('id, shipper_ref, company_name')
        .eq('phone', phone)
        .neq('id', shipperId);

    if (phoneCheckError) {
      console.error('Phone duplicate check error:', phoneCheckError);
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
      .neq('id', shipperId)
      .limit(10);

  if (companyCheckError) {
    console.error('Company duplicate check error:', companyCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const shipper of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(shipper.company_name);
    if (candidateNormalized === normalizedNameForExactMatch) {
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

  const { data, error } = await supabase
    .from('shippers')
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
    .eq('id', shipperId)
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
    .single();

  if (error) {
    console.error('Update shipper error:', error);
    if (error.code === '23505') {
      return {
        success: false,
        error: 'A shipper with this unique information already exists',
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    shipper: data as Shipper,
    warnings,
  };
}