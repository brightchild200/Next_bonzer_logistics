'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export type IdentifierType = 'gst_number' | 'pan_number';

export interface IdentifierConflictResult {
  success: true;
  conflict: {
    type: IdentifierType;
    customer_id: string;
    customer_ref: string;
    company_name: string;
    value: string;
  } | null;
}

export interface IdentifierConflictError {
  success: false;
  error: string;
}

export type CheckCustomerIdentifierResult =
  | IdentifierConflictResult
  | IdentifierConflictError;

function normalizeValue(value?: string): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

export async function checkCustomerIdentifierConflict(
  identifierType: IdentifierType,
  value: string,
  excludeCustomerId?: string
): Promise<CheckCustomerIdentifierResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc(
    'get_my_auth_context'
  );

  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  if (!userPermissions.includes(PERMISSIONS.CUSTOMER.READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const normalized = normalizeValue(value);
  if (!normalized) {
    return { success: true, conflict: null };
  }

  let query = supabase
    .from('customers')
    .select('id, customer_ref, company_name')
    .eq(identifierType, normalized);

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      success: false,
      error: `Failed to validate ${identifierType.replace('_', ' ')}`,
    };
  }

  if (!data) {
    return { success: true, conflict: null };
  }

  return {
    success: true,
    conflict: {
      type: identifierType,
      customer_id: data.id,
      customer_ref: data.customer_ref,
      company_name: data.company_name,
      value: normalized,
    },
  };
}
