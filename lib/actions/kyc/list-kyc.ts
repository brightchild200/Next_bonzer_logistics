'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  KycRecord,
  ListKycParams,
  ListKycResult,
} from './types';

const VALID_SORT_COLUMNS: (keyof KycRecord)[] = [
  'company_name',
  'customer_ref',
  'city',
  'state',
  'kyc_status',
  'created_at',
  'updated_at',
];

export async function listKycRecords(params: ListKycParams = {}): Promise<ListKycResult> {
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

  if (
    !userPermissions.includes(PERMISSIONS.KYC.READ) &&
    !userPermissions.includes(PERMISSIONS.CUSTOMER.READ)
  ) {
    return {
      success: false,
      error: 'Insufficient permissions',
    };
  }

  const {
    search = '',
    status = 'all',
    page = 0,
    pageSize = 20,
    sortBy = 'updated_at',
    sortOrder = 'desc',
  } = params;

  const cappedPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = page * cappedPageSize;

  const sortColumn = VALID_SORT_COLUMNS.includes(sortBy) ? sortBy : 'updated_at';
  const sortDirection = sortOrder === 'desc' ? 'desc' : 'asc';

  let query = supabase
    .from('customers')
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
      `,
      { count: 'exact' }
    );

  if (status !== 'all') {
    query = query.eq('kyc_status', status);
  }

  if (search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `company_name.ilike.%${searchTerm}%,` +
      `customer_ref.ilike.%${searchTerm}%,` +
      `contact_person.ilike.%${searchTerm}%,` +
      `email.ilike.%${searchTerm}%,` +
      `phone.ilike.%${searchTerm}%,` +
      `city.ilike.%${searchTerm}%,` +
      `state.ilike.%${searchTerm}%`
    );
  }

  query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('List KYC records error:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  const records: KycRecord[] = (data ?? []).map((customer) => {
    const enquiries = Array.isArray(customer.enquiries) ? customer.enquiries : [];
    const latestEnquiry = enquiries.length > 0
      ? enquiries.reduce((latest, e) =>
          new Date(e.created_at) > new Date(latest.created_at) ? e : latest
        )
      : null;

    return {
      id: customer.id,
      customer_ref: customer.customer_ref,
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      state: customer.state,
      kyc_status: customer.kyc_status,
      is_active: customer.is_active,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      enquiry_count: enquiries.length,
      latest_enquiry_ref: latestEnquiry?.reference ?? null,
      latest_enquiry_status: latestEnquiry?.status ?? null,
    };
  });

  return {
    success: true,
    records,
    totalCount: count ?? 0,
  };
}