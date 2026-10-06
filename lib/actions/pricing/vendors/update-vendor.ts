'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { Vendor, UpdateVendorInput, UpdateVendorResult } from '../types';
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

export async function updateVendor(input: UpdateVendorInput): Promise<UpdateVendorResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.UPDATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateVendorInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { vendor_id, ...updateData } = input;

  if (!vendor_id?.trim()) {
    return { success: false, error: 'Vendor ID is required' };
  }

  const { data: existingVendor, error: fetchError } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendor_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[updateVendor] Fetch error:', fetchError);
    return { success: false, error: 'Failed to fetch vendor' };
  }

  if (!existingVendor) {
    return { success: false, error: 'Vendor not found' };
  }

  const companyName = normalizeCompanyName(updateData.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!companyName) {
    return { success: false, error: 'Company name is required' };
  }

  const email = normalizeEmail(updateData.email);
  const phone = normalizeOptional(updateData.phone);
  const gstNumber = normalizeGst(updateData.gst_number);
  const panNumber = normalizePan(updateData.pan_number);

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

  if (gstNumber && gstNumber !== existingVendor.gst_number) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('gst_number', gstNumber)
      .neq('id', vendor_id)
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

  if (panNumber && panNumber !== existingVendor.pan_number) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('vendors')
      .select('id, vendor_ref, company_name')
      .eq('pan_number', panNumber)
      .neq('id', vendor_id)
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

  if (companyName !== existingVendor.company_name) {
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
  }

  const updatePayload: Record<string, any> = {
    company_name: companyName,
    contact_person: normalizeOptional(updateData.contact_person),
    email: email,
    phone: phone,
    address: normalizeOptional(updateData.address),
    city: normalizeOptional(updateData.city),
    state: normalizeOptional(updateData.state),
    country: normalizeOptional(updateData.country) ?? 'India',
    pincode: normalizeOptional(updateData.pincode),
    gst_number: gstNumber ? gstNumber : null,
    pan_number: panNumber ? panNumber : null,
  };

  const { data, error } = await supabase
    .from('vendors')
    .update(updatePayload)
    .eq('id', vendor_id)
    .select('*')
    .single();

  if (error) {
    console.error('[updateVendor] Update error:', error);
    const errorMessage = error.message;
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
    return { success: false, error: 'Failed to update vendor' };
  }

  return {
    success: true,
    vendor: data as Vendor,
  };
}