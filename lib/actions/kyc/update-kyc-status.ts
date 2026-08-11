'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  KycRecord,
  UpdateKycStatusInput,
  UpdateKycStatusResult,
} from './types';

export async function updateKycStatus(
  input: UpdateKycStatusInput
): Promise<UpdateKycStatusResult> {
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

  if (!userPermissions.includes(PERMISSIONS.KYC.UPDATE)) {
    return {
      success: false,
      error: 'Insufficient permissions to update KYC status',
    };
  }

  const customerId = input.customer_id?.trim();
  const kycStatus = input.kyc_status;

  if (!customerId) {
    return {
      success: false,
      error: 'customer_id is required',
    };
  }

  const validStatuses: KycRecord['kyc_status'][] = ['pending', 'submitted', 'verified', 'rejected'];
  if (!validStatuses.includes(kycStatus)) {
    return {
      success: false,
      error: 'Invalid KYC status',
    };
  }

  const { data, error } = await supabase
    .from('customers')
    .update({ kyc_status: kycStatus })
    .eq('id', customerId)
    .select(
      `
        id,
        customer_ref,
        company_name,
        contact_person,
        email,
        phone,
        city,
        state,
        kyc_status,
        is_active,
        created_at,
        updated_at,
        enquiries:enquiries!enquiries_customer_id_fkey(
          id,
          reference,
          status,
          created_at
        )
      `
    )
    .single();

  if (error) {
    console.error('Update KYC status error:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  const enquiries = Array.isArray(data.enquiries) ? data.enquiries : [];
  const latestEnquiry = enquiries.length > 0
    ? enquiries.reduce((latest, e) =>
        new Date(e.created_at) > new Date(latest.created_at) ? e : latest
      )
    : null;

  const record: KycRecord = {
    id: data.id,
    customer_ref: data.customer_ref,
    company_name: data.company_name,
    contact_person: data.contact_person,
    email: data.email,
    phone: data.phone,
    city: data.city,
    state: data.state,
    kyc_status: data.kyc_status,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    enquiry_count: enquiries.length,
    latest_enquiry_ref: latestEnquiry?.reference ?? null,
    latest_enquiry_status: latestEnquiry?.status ?? null,
  };

  return {
    success: true,
    customer: record,
  };
}