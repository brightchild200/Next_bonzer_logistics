'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Customer,
  CustomerDuplicateWarning,
  CustomerInput,
  CreateCustomerPartyResult,
} from './types';

export type CreateCustomerResult =
  | {
      success: true;
      customer: Customer;
      warnings: CustomerDuplicateWarning[];
      partyResult: CreateCustomerPartyResult;
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

export async function createCustomer(
  input: CustomerInput
): Promise<CreateCustomerResult> {
  console.log('[createCustomer] START');

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[createCustomer] AUTH DONE', {
    hasUser: !!user,
    authError: authError?.message,
  });

  if (authError || !user) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  console.log('[createCustomer] AUTH CONTEXT START');

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  console.log('[createCustomer] AUTH CONTEXT DONE', {
    hasContext: !!authContext,
    error: authContextError?.message,
  });

  if (authContextError || !authContext) {
    return {
      success: false,
      error: 'Failed to resolve auth context',
    };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  console.log('[createCustomer] PERMISSIONS', userPermissions);

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.CREATE)) {
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

  console.log('[createCustomer] NORMALIZED INPUT', {
    companyName,
    email,
    phone,
    gstNumber,
    panNumber,
  });

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

  const warnings: CustomerDuplicateWarning[] = [];

  if (gstNumber) {
    console.log('[createCustomer] GST CHECK START', gstNumber);

    const { data: gstDuplicate, error: gstCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('gst_number', gstNumber)
      .maybeSingle();

    console.log('[createCustomer] GST CHECK DONE', {
      duplicate: gstDuplicate,
      error: gstCheckError?.message,
    });

    if (gstCheckError) {
      console.error(
        '[createCustomer] GST duplicate check error:',
        gstCheckError
      );

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

  // Exact normalized company name check (hard conflict)
  // Must match migration 007: upper(regexp_replace(trim(company_name), '\s+', ' ', 'g'))
  const normalizedInputName = normalizeCompanyNameForComparison(companyName);
  
  const { data: allCustomersForExactCheck, error: exactNameCheckError } = await supabase
    .from('customers')
    .select('id, customer_ref, company_name');

  if (exactNameCheckError) {
    console.error('[createCustomer] Exact company name check error:', exactNameCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  const exactMatch = (allCustomersForExactCheck ?? []).find(
    (c) => normalizeCompanyNameForComparison(c.company_name) === normalizedInputName
  );

  if (exactMatch) {
    return {
      success: false,
      error: `Company name already exists: ${exactMatch.company_name} (${exactMatch.customer_ref})`,
    };
  }

  if (panNumber) {
    console.log('[createCustomer] PAN CHECK START', panNumber);

    const { data: panDuplicate, error: panCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('pan_number', panNumber)
      .maybeSingle();

    console.log('[createCustomer] PAN CHECK DONE', {
      duplicate: panDuplicate,
      error: panCheckError?.message,
    });

    if (panCheckError) {
      console.error('[createCustomer] PAN duplicate check error:', panCheckError);
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
    console.log('[createCustomer] EMAIL CHECK START', email);

    const { data: emailDuplicates, error: emailCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('email', email);

    console.log('[createCustomer] EMAIL CHECK DONE', {
      count: emailDuplicates?.length,
      error: emailCheckError?.message,
    });

    if (emailCheckError) {
      console.error('[createCustomer] Email duplicate check error:', emailCheckError);
      return { success: false, error: 'Failed to validate customer email' };
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
    console.log('[createCustomer] PHONE CHECK START', phone);

    const { data: phoneDuplicates, error: phoneCheckError } = await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .eq('phone', phone);

    console.log('[createCustomer] PHONE CHECK DONE', {
      count: phoneDuplicates?.length,
      error: phoneCheckError?.message,
    });

    if (phoneCheckError) {
      console.error('[createCustomer] Phone duplicate check error:', phoneCheckError);
      return { success: false, error: 'Failed to validate customer phone' };
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

  console.log('[createCustomer] SIMILAR COMPANY CHECK START', companyName);

  const { data: companyCandidates, error: companyCheckError } =
    await supabase
      .from('customers')
      .select('id, customer_ref, company_name')
      .ilike('company_name', `%${companyName}%`)
      .limit(10);

  console.log('[createCustomer] SIMILAR COMPANY CHECK DONE', {
    count: companyCandidates?.length,
    error: companyCheckError?.message,
  });

  if (companyCheckError) {
    console.error('[createCustomer] Company duplicate check error:', companyCheckError);
    return { success: false, error: 'Failed to validate company name' };
  }

  for (const customer of companyCandidates ?? []) {
    const candidateNormalized = normalizeCompanyNameForComparison(customer.company_name);
    if (candidateNormalized === normalizedInputName) {
      continue; // already caught by exact match check
    }
    warnings.push({
      type: 'company_name',
      customer_id: customer.id,
      customer_ref: customer.customer_ref,
      company_name: customer.company_name,
      message: `Similar company already exists: ${customer.company_name} (${customer.customer_ref})`,
    });
  }

  console.log('[createCustomer] RPC CALL START');

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'create_customer_with_party_records',
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
      p_add_as_shipper: input.addAsShipper ?? false,
      p_add_as_consignee: input.addAsConsignee ?? false,
    }
  );

  console.log('[createCustomer] RPC CALL DONE', {
    result: rpcResult,
    error: rpcError?.message,
  });

  if (rpcError) {
    console.error('[createCustomer] RPC error:', rpcError);

    const errorMessage = rpcError.message;
    if (errorMessage.includes('Invalid PAN format') || errorMessage.includes('Invalid GSTIN format') || errorMessage.includes('does not match provided PAN')) {
      return { success: false, error: errorMessage };
    }
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      if (errorMessage.includes('customers_company_name_norm_unique')) {
        return { success: false, error: 'Company name already exists (exact match after normalization)' };
      }
      if (errorMessage.includes('customers_gst_number')) {
        return { success: false, error: 'GST number already exists' };
      }
      return { success: false, error: 'A customer with this unique information already exists' };
    }
    if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Unauthorized')) {
      return { success: false, error: errorMessage };
    }

    return { success: false, error: errorMessage };
  }

  const partyResult = rpcResult as CreateCustomerPartyResult;

  const { data: customerData, error: customerFetchError } = await supabase
    .from('customers')
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
    .eq('customer_ref', partyResult.customer_ref)
    .single();

  if (customerFetchError || !customerData) {
    console.error('[createCustomer] Failed to fetch created customer:', customerFetchError);
    return { success: false, error: 'Customer created but failed to fetch details' };
  }

  console.log('[createCustomer] SUCCESS', {
    customerRef: customerData.customer_ref,
    warnings: warnings.length,
    partyResult,
  });

  return {
    success: true,
    customer: customerData as Customer,
    warnings,
    partyResult,
  };
}

