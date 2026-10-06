'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Vendor,
  VendorInput,
  CreateVendorResult,
  CreateVendorPartyResult,
  VendorDuplicateWarning,
} from '../types';
import {
  normalizeOptional,
  normalizeEmail,
  normalizeGst,
  normalizePan,
  normalizeCompanyName,
  normalizeCompanyNameForComparison,
  validateEmailFormat,
  validatePhoneFormat,
  validatePanFormat,
  validateGstinFormat,
  validatePanGstMatch,
  validateVendorInput,
} from '../validations';

export async function createVendor(input: VendorInput): Promise<CreateVendorResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateVendorInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const companyName = normalizeCompanyName(input.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!companyName) {
    return { success: false, error: 'Company name is required' };
  }

  const email = normalizeEmail(input.email);
  const phone = normalizeOptional(input.phone);
  const gstNumber = normalizeGst(input.gst_number);
  const panNumber = normalizePan(input.pan_number);

  if (email) {
    const emailError = validateEmailFormat(email);
    if (emailError) return { success: false, error: emailError };
  }

  if (phone) {
    const phoneError = validatePhoneFormat(phone);
    if (phoneError) return { success: false, error: phoneError };
  }

  if (panNumber) {
    const panError = validatePanFormat(panNumber);
    if (panError) return { success: false, error: panError };
  }

  if (gstNumber) {
    const gstinError = validateGstinFormat(gstNumber);
    if (gstinError) return { success: false, error: gstinError };
  }

  if (panNumber && gstNumber) {
    const matchError = validatePanGstMatch(panNumber, gstNumber);
    if (matchError) return { success: false, error: matchError };
  }

  const warnings: VendorDuplicateWarning[] = [];

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('gst_number', gstNumber)
      .maybeSingle();

    if (gstCheckError) {
      return { success: false, error: 'Failed to validate GST number' };
    }

    if (gstDuplicate) {
      return {
        success: false,
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.vendor_ref})`,
      };
    }
  }

  const { data: allVendorsForExactCheck, error: exactNameCheckError } = await supabase
    .from('vendors')
    .select('id, vendor_ref, company_name');

  if (exactNameCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allVendorsForExactCheck ?? []).find(
    (v) => normalizeCompanyNameForComparison(v.company_name) === normalizedCompanyNameForComparison
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.vendor_ref})`,
    };
  }

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('pan_number', panNumber)
      .maybeSingle();

    if (panCheckError) {
      return { success: false, error: 'Failed to validate PAN' };
    }

    if (panDuplicate) {
      return {
        success: false,
        error: `PAN already exists for ${panDuplicate.company_name} (${panDuplicate.vendor_ref})`,
      };
    }
  }

  if (email) {
    const { data: emailDuplicates, error: emailCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('email', email);

    if (emailCheckError) {
      return { success: false, error: 'Failed to validate vendor email' };
    }

    for (const vendor of emailDuplicates ?? []) {
      warnings.push({
        type: 'email',
        vendor_id: vendor.id,
        vendor_ref: vendor.vendor_ref,
        company_name: vendor.company_name,
        message: `Email already exists for ${vendor.company_name} (${vendor.vendor_ref})`,
      });
    }
  }

  if (phone) {
    const { data: phoneDuplicates, error: phoneCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('phone', phone);

    if (phoneCheckError) {
      return { success: false, error: 'Failed to validate vendor phone' };
    }

    for (const vendor of phoneDuplicates ?? []) {
      warnings.push({
        type: 'phone',
        vendor_id: vendor.id,
        vendor_ref: vendor.vendor_ref,
        company_name: vendor.company_name,
        message: `Phone already exists for ${vendor.company_name} (${vendor.vendor_ref})`,
      });
    }
  }

  const { data: companyCandidates, error: companyCheckError } = await supabase
    .from('vendors')
    .select('id, vendor_ref, company_name')
    .ilike('company_name', `%${companyName}%`)
    .limit(10);

  if (companyCheckError) {
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const vendor of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(vendor.company_name);
    if (candidateNormalized === normalizedCompanyNameForComparison) {
      continue;
    }
    warnings.push({
      type: 'company_name',
      vendor_id: vendor.id,
      vendor_ref: vendor.vendor_ref,
      company_name: vendor.company_name,
      message: `Similar vendor already exists: ${vendor.company_name} (${vendor.vendor_ref})`,
    });
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_vendor', {
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
  });

  if (rpcError) {
    console.error('[createVendor] RPC error:', rpcError);
    const errorMessage = rpcError.message;
    if (
      errorMessage.includes('Invalid PAN format') ||
      errorMessage.includes('Invalid GSTIN format') ||
      errorMessage.includes('does not match provided PAN')
    ) {
      return { success: false, error: errorMessage };
    }
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      if (errorMessage.includes('vendors_gst_number')) {
        return { success: false, error: 'GST number already exists' };
      }
      if (errorMessage.includes('vendors_pan_number')) {
        return { success: false, error: 'PAN already exists' };
      }
      if (errorMessage.includes('vendors_company_name_norm_unique')) {
        return { success: false, error: 'Company name already exists (exact match after normalization)' };
      }
      return { success: false, error: 'A vendor with this unique information already exists' };
    }
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }
    return { success: false, error: errorMessage };
  }

  const partyResult = rpcResult as CreateVendorPartyResult;

  const { data: vendorData, error: vendorFetchError } = await supabase
    .from('vendors')
    .select(
      `
      id,
      vendor_ref,
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
    .eq('vendor_ref', partyResult.vendor_ref)
    .single();

  if (vendorFetchError || !vendorData) {
    console.error('[createVendor] Failed to fetch created vendor:', vendorFetchError);
    return { success: false, error: 'Vendor created but failed to fetch details' };
  }

  return {
    success: true,
    vendor: vendorData as Vendor,
    warnings,
    partyResult,
  };
}