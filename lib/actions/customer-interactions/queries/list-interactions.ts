'use server';

import { createClient } from '@/lib/db/server';
import { createAdminClient } from '@/lib/db/admin';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { CustomerInteraction, InteractionChannel, InteractionFilters } from '../types';

type CustomerInteractionRow = {
  id: string;
  interaction_ref: string;
  customer_id: string;
  enquiry_id: string | null;
  employee_id: string;
  interaction_type_id: string;
  interaction_outcome_id: string;
  subject: string | null;
  notes: string;
  interaction_at: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  contact_person_name: string;
  contact_person_mobile: string;
  contact_person_email: string | null;
  contact_person_designation: string | null;
  interaction_channel: string;
  interaction_duration_minutes: number | null;
};

type CustomerDisplayRow = {
  id: string;
  customer_ref: string;
  company_name: string;
};

type EmployeeDisplayRow = {
  id: string;
  full_name: string;
  employee_code: string | null;
};

export interface ListInteractionsResult {
  success: true;
  interactions: CustomerInteraction[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListInteractionsError {
  success: false;
  error: string;
}

export type ListInteractionsResponse = ListInteractionsResult | ListInteractionsError;

async function getSalespersonTeamMemberIds(supabase: ReturnType<typeof createClient>, currentUserId: string): Promise<string[]> {
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'salesperson')
    .single();

  if (!roleData) {
    return [];
  }

  const { data: teamMembers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', roleData.id);

  return (teamMembers ?? []).map(m => m.user_id).filter(id => id !== currentUserId);
}

export async function listInteractions(
  filters: InteractionFilters = {}
): Promise<ListInteractionsResponse> {
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

  const hasReadAll = userPermissions.includes(PERMISSIONS.INTERACTION.READ_ALL);
  const hasReadTeam = userPermissions.includes(PERMISSIONS.INTERACTION.READ_TEAM);
  const hasReadOwn = userPermissions.includes(PERMISSIONS.INTERACTION.READ_OWN);

  if (!hasReadAll && !hasReadTeam && !hasReadOwn) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = supabase
    .from('customer_interactions')
    .select(
      `
      id,
      interaction_ref,
      customer_id,
      enquiry_id,
      employee_id,
      interaction_type_id,
      interaction_outcome_id,
      subject,
      notes,
      interaction_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_active,
      contact_person_name,
      contact_person_mobile,
      contact_person_email,
      contact_person_designation,
      interaction_channel,
      interaction_duration_minutes
      `,
      { count: 'exact' }
    )
    .order('interaction_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply scope-based employee filtering (UNION of all granted scopes)
  if (!hasReadAll) {
    const allowedEmployeeIds = new Set<string>();

    if (hasReadTeam) {
      const teamMemberIds = await getSalespersonTeamMemberIds(supabase, user.id);
      teamMemberIds.forEach((id) => allowedEmployeeIds.add(id));
    }

    if (hasReadOwn) {
      allowedEmployeeIds.add(user.id);
    }

    if (allowedEmployeeIds.size === 0) {
      return {
        success: true,
        interactions: [],
        total: 0,
        limit,
        offset,
      };
    }

    query = query.in('employee_id', Array.from(allowedEmployeeIds));
  }

  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters.employeeId) {
    if (!hasReadAll) {
      const allowedEmployeeIds = new Set<string>();

      if (hasReadTeam) {
        const teamMemberIds = await getSalespersonTeamMemberIds(supabase, user.id);
        teamMemberIds.forEach((id) => allowedEmployeeIds.add(id));
      }

      if (hasReadOwn) {
        allowedEmployeeIds.add(user.id);
      }

      if (!allowedEmployeeIds.has(filters.employeeId)) {
        return { success: false, error: 'Insufficient permissions to filter by that employee' };
      }
    }
    query = query.eq('employee_id', filters.employeeId);
  }

  if (filters.interactionTypeId) {
    query = query.eq('interaction_type_id', filters.interactionTypeId);
  }

  if (filters.interactionOutcomeId) {
    query = query.eq('interaction_outcome_id', filters.interactionOutcomeId);
  }

  if (filters.enquiryId !== undefined) {
    if (filters.enquiryId === null) {
      query = query.is('enquiry_id', null);
    } else {
      query = query.eq('enquiry_id', filters.enquiryId);
    }
  }

  if (filters.dateFrom) {
    query = query.gte('interaction_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('interaction_at', filters.dateTo);
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.search) {
    query = query.or(
      `subject.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,interaction_ref.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[listInteractions] Query error:', error);
    return { success: false, error: 'Failed to fetch interactions' };
  }

  const interactionsData = data ?? [];

  const customerIds = Array.from(new Set(interactionsData.map((row) => row.customer_id)));
  const employeeIds = Array.from(new Set(interactionsData.map((row) => row.employee_id)));

  let customerDisplayMap = new Map<string, { customerRef: string; companyName: string }>();
  let employeeDisplayMap = new Map<string, { employeeName: string; employeeCode: string | null }>();

  if (customerIds.length > 0 || employeeIds.length > 0) {
    const adminClient = createAdminClient();

    if (customerIds.length > 0) {
      const { data: customersData } = await adminClient
        .from('customers')
        .select('id, customer_ref, company_name')
        .in('id', customerIds);

      if (customersData) {
        customerDisplayMap = new Map(
          (customersData as CustomerDisplayRow[]).map((row) => [
            row.id,
            { customerRef: row.customer_ref, companyName: row.company_name },
          ])
        );
      }
    }

    if (employeeIds.length > 0) {
      const { data: employeesData } = await adminClient
        .from('profiles')
        .select('id, full_name, employee_code')
        .in('id', employeeIds);

      if (employeesData) {
        employeeDisplayMap = new Map(
          (employeesData as EmployeeDisplayRow[]).map((row) => [
            row.id,
            { employeeName: row.full_name, employeeCode: row.employee_code },
          ])
        );
      }
    }
  }

  return {
    success: true,
    interactions: interactionsData.map((interaction) => {
      const row = interaction as CustomerInteractionRow;
      const customerDisplay = customerDisplayMap.get(row.customer_id);
      const employeeDisplay = employeeDisplayMap.get(row.employee_id);
      return {
        id: row.id,
        interactionRef: row.interaction_ref,
        customerId: row.customer_id,
        customerRef: customerDisplay?.customerRef ?? '',
        companyName: customerDisplay?.companyName ?? '',
        enquiryId: row.enquiry_id,
        employeeId: row.employee_id,
        employeeName: employeeDisplay?.employeeName ?? null,
        employeeCode: employeeDisplay?.employeeCode ?? null,
        interactionTypeId: row.interaction_type_id,
        interactionOutcomeId: row.interaction_outcome_id,
        subject: row.subject,
        notes: row.notes,
        interactionAt: row.interaction_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: row.is_active,
        contactPersonName: row.contact_person_name,
        contactPersonMobile: row.contact_person_mobile,
        contactPersonEmail: row.contact_person_email,
        contactPersonDesignation: row.contact_person_designation,
        interactionChannel: row.interaction_channel as InteractionChannel,
        interactionDurationMinutes: row.interaction_duration_minutes,
      } satisfies CustomerInteraction;
    }),
    total: count ?? 0,
    limit,
    offset,
  };
}