'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';

export interface CustomerDetail {
  id: string;
  customer_ref: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gst_number: string | null;
  pan_number: string | null;
  is_active: boolean;
}

export interface GetCustomerResult {
  success: true;
  customer: CustomerDetail;
}

export interface GetCustomerError {
  success: false;
  error: string;
}

export type GetCustomerResponse = GetCustomerResult | GetCustomerError;

export async function getCustomer(
  customerId: string
): Promise<GetCustomerResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.CUSTOMER.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
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
      is_active
      `
    )
    .eq('id', customerId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Customer not found' };
  }

  return {
    success: true,
    customer: data as CustomerDetail,
  };
}