'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Customer,
  CustomerDuplicateWarning,
  UpdateCustomerInput,
} from './types';

export type UpdateCustomerResult =
  | {
      success: true;
      customer: Customer;
      warnings: CustomerDuplicateWarning[];
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

export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<UpdateCustomerResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError || !authContext) {
    return {
      success: false,
      error: 'Failed to resolve auth context',
    };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.UPDATE)) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const customerId = input.customer_id?.trim();
  const companyName = normalizeCompanyName(input.company_name ?? '');
  const normalizedCompanyNameForComparison = normalizeCompanyNameForComparison(companyName);

  if (!customerId) {
    return {
      success: false,
      error: 'customer_id is required',
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

  const { data: existingCustomer, error: existingCustomerError } =
    await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .maybeSingle();

  if (existingCustomerError) {
    console.error(
      'Existing customer lookup error:',
      existingCustomerError
    );

    return {
      success: false,
      error: 'Failed to validate customer',
    };
  }

  if (!existingCustomer) {
    return {
      success: false,
      error: 'Customer not found',
    };
  }

  if (gstNumber) {
    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('gst_number', gstNumber)
      .neq('id', customerId)
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
        error: `GST number already belongs to ${gstDuplicate.company_name} (${gstDuplicate.customer_ref})`,
      };
    }
  }

  const normalizedNameForExactMatch = normalizeCompanyNameForComparison(companyName);

  const { data: allCustomersForExactCheck, error: exactNameCheckError } = await supabase
    .from('customers')
    .select('id, customer_ref, company_name')
    .neq('id', customerId);

  if (exactNameCheckError) {
    console.error('Exact company name check error:', exactNameCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allCustomersForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedNameForExactMatch
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.customer_ref})`,
    };
  }

  const warnings: CustomerDuplicateWarning[] = [];

  if (panNumber) {
    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('pan_number', panNumber)
      .neq('id', customerId)
      .maybeSingle();

    if (panCheckError) {
      console.error('PAN duplicate check error:', panCheckError);
      return { success: false, error: 'Failed to validate PAN' };
    }

    if (panDuplicate) {
      return {
        success: false,
        error: `PAN already exists for ${panDuplicate.company_name} (${panDuplicate.customer_ref})`,
      };
    }
  }

  if (email) {
    const { data: emailDuplicates, error: emailCheckError } =
      await supabase
        .from('customers')
        .select('id, customer_ref, company_name')
        .eq('email', email)
        .neq('id', customerId);

    if (emailCheckError) {
      console.error('Email duplicate check error:', emailCheckError);

      return {
        success: false,
        error: 'Failed to validate customer email',
      };
    }

    for (const customer of emailDuplicates ?? []) {
      warnings.push({
        type: 'email',
        customer_id: customer.id,
        customer_ref: customer.customer_ref,
        company_name: customer.company_name,
        message: `Email already exists for ${customer.company_name} (${customer.customer_ref})`,
      });
    }
  }

  if (phone) {
    const { data: phoneDuplicates, error: phoneCheckError } =
      await supabase
        .from('customers')
        .select('id, customer_ref, company_name')
        .eq('phone', phone)
        .neq('id', customerId);

    if (phoneCheckError) {
      console.error('Phone duplicate check error:', phoneCheckError);

      return {
        success: false,
        error: 'Failed to validate customer phone',
      };
    }

    for (const customer of phoneDuplicates ?? []) {
      warnings.push({
        type: 'phone',
        customer_id: customer.id,
        customer_ref: customer.customer_ref,
        company_name: customer.company_name,
        message: `Phone already exists for ${customer.company_name} (${customer.customer_ref})`,
      });
    }
  }

  const { data: companyCandidates, error: companyCheckError } =
    await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .ilike('company_name', `%${companyName}%`)
      .neq('id', customerId)
      .limit(10);

  if (companyCheckError) {
    console.error('Company duplicate check error:', companyCheckError);

    return {
      success: false,
      error: 'Failed to validate company name',
    };
  }

  for (const customer of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(customer.company_name);
    if (candidateNormalized === normalizedNameForExactMatch) {
      continue;
    }
    warnings.push({
      type: 'company_name',
      customer_id: customer.id,
      customer_ref: customer.customer_ref,
      company_name: customer.company_name,
      message: `Similar company already exists: ${customer.company_name} (${customer.customer_ref})`,
    });
  }

  const { data, error } = await supabase
    .from('customers')
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
    .eq('id', customerId)
    .select(
      `
        id,
        customer_ref,
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
        kyc_status,
        is_active,
        created_by,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    console.error('Update customer error:', error);

    if (error.code === '23505') {
      return {
        success: false,
        error: 'A customer with this unique information already exists',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    customer: data as Customer,
    warnings,
  };
}