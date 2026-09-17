'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

export interface ExportInteractionsFilters {
  customerId?: string;
  employeeId?: string;
  interactionTypeId?: string;
  interactionOutcomeId?: string;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  search?: string;
}

interface InteractionExportRow {
  id: string;
  interaction_ref: string;
  customer_id: string;
  customer_ref: string;
  company_name: string;
  enquiry_id: string | null;
  employee_id: string;
  employee_name: string | null;
  employee_code: string | null;
  interaction_type_id: string;
  interaction_outcome_id: string;
  subject: string | null;
  notes: string;
  interaction_at: string;
  interaction_channel: string;
  interaction_duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExportInteractionsResult {
  success: true;
  rows: InteractionExportRow[];
}

export interface ExportInteractionsError {
  success: false;
  error: string;
}

export type ExportInteractionsResponse = ExportInteractionsResult | ExportInteractionsError;

export async function exportInteractions(
  filters: ExportInteractionsFilters = {}
): Promise<ExportInteractionsResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;
  const userPermissions: Permission[] = authContext.permissions;

  const hasReadAll = userPermissions.includes(PERMISSIONS.INTERACTION.READ_ALL);
  const hasReadTeam = userPermissions.includes(PERMISSIONS.INTERACTION.READ_TEAM);
  const hasReadOwn = userPermissions.includes(PERMISSIONS.INTERACTION.READ_OWN);

  if (!hasReadAll && !hasReadTeam && !hasReadOwn) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabase = createClient();

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
      interaction_channel,
      interaction_duration_minutes,
      is_active,
      created_at,
      updated_at
      `
    )
    .order('interaction_at', { ascending: false });

  if (!hasReadAll) {
    const allowedEmployeeIds = new Set<string>();

    if (hasReadTeam) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'salesperson')
        .single();

      if (roleData) {
        const { data: teamMembers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role_id', roleData.id);

        (teamMembers ?? []).map(m => m.user_id).filter(id => id !== authContext.userId).forEach(id => allowedEmployeeIds.add(id));
      }
    }

    if (hasReadOwn) {
      allowedEmployeeIds.add(authContext.userId);
    }

    if (allowedEmployeeIds.size > 0) {
      query = query.in('employee_id', Array.from(allowedEmployeeIds));
    } else {
      return { success: true, rows: [] };
    }
  }

  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters.employeeId) {
    if (!hasReadAll) {
      const allowedEmployeeIds = new Set<string>();

      if (hasReadTeam) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'salesperson')
          .single();

        if (roleData) {
          const { data: teamMembers } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role_id', roleData.id);

          (teamMembers ?? []).map(m => m.user_id).filter(id => id !== authContext.userId).forEach(id => allowedEmployeeIds.add(id));
        }
      }

      if (hasReadOwn) {
        allowedEmployeeIds.add(authContext.userId);
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

  const { data, error } = await query.range(0, 9999);

  if (error) {
    console.error('[exportInteractions] Query error:', error);
    return { success: false, error: 'Failed to fetch interactions for export' };
  }

  return {
    success: true,
    rows: (data ?? []) as InteractionExportRow[],
  };
}