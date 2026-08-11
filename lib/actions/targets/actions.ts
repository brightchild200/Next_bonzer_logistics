'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type {
  SalesTarget,
  CreateTargetInput,
  UpdateTargetInput,
  CreateTargetResult,
  UpdateTargetResult,
  GetTargetResult,
  ListTargetsParams,
  ListTargetsResult,
  TargetProgress,
  TargetWithProgress,
  ListTargetsWithProgressParams,
  ListTargetsWithProgressResult,
} from './types';

async function getUserAndPermissions(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, permissions: [] as Permission[], error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } =
    await supabase.rpc('get_my_auth_context');

  if (authContextError || !authContext) {
    return { user, permissions: [] as Permission[], error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];

  return { user, permissions: userPermissions, error: null };
}

function validateTargetValue(value: number): string | null {
  if (!Number.isInteger(value) || value <= 0) {
    return 'Target value must be a positive integer';
  }
  return null;
}

function validatePeriod(start: string, end: string): string | null {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format';
  }
  if (endDate < startDate) {
    return 'Period end must be on or after period start';
  }
  return null;
}

async function verifySalesperson(supabase: ReturnType<typeof createClient>, salespersonId: string): Promise<boolean> {
  const { data: role } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', salespersonId)
    .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id)
    .maybeSingle();
  return !!role;
}

async function calculateProgress(
  supabase: ReturnType<typeof createClient>,
  salespersonId: string,
  periodStart: string,
  periodEnd: string
): Promise<TargetProgress> {
  const start = new Date(periodStart).toISOString();
  const end = new Date(periodEnd).toISOString();

  // Customer Interactions - employee_id + interaction_at
  const { count: interactionsCount } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', salespersonId)
    .gte('interaction_at', start)
    .lte('interaction_at', end)
    .eq('is_active', true);

  // Enquiries - created_by + created_at
  const { count: enquiriesCount } = await supabase
    .from('enquiries')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', salespersonId)
    .gte('created_at', start)
    .lte('created_at', end);

  // JOBS (calculated from shipments) - owner_id + created_at
  const { count: jobsCount } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', salespersonId)
    .gte('created_at', start)
    .lte('created_at', end);

  return {
    customer_interactions: interactionsCount ?? 0,
    enquiries: enquiriesCount ?? 0,
    jobs: jobsCount ?? 0,
  };
}

export async function createTarget(input: CreateTargetInput): Promise<CreateTargetResult> {
  const supabase = createClient();

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (!permissions.includes(PERMISSIONS.TARGET.CREATE)) {
    return { success: false, error: 'Insufficient permissions to create target' };
  }

  const valError = validateTargetValue(input.target_value);
  if (valError) return { success: false, error: valError };

  const periodError = validatePeriod(input.period_start, input.period_end);
  if (periodError) return { success: false, error: periodError };

  const isSalesperson = await verifySalesperson(supabase, input.salesperson_id);
  if (!isSalesperson) {
    return { success: false, error: 'Target can only be created for a Salesperson' };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sales_targets')
    .insert({
      salesperson_id: input.salesperson_id,
      metric: input.metric,
      target_value: input.target_value,
      period_start: input.period_start,
      period_end: input.period_end,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Target already exists for this salesperson, metric, and period' };
    }
    console.error('Create target error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, target: data as SalesTarget };
}

export async function updateTarget(input: UpdateTargetInput): Promise<UpdateTargetResult> {
  const supabase = createClient();

  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) {
    return { success: false, error: authError ?? 'Unauthorized' };
  }

  if (!permissions.includes(PERMISSIONS.TARGET.UPDATE)) {
    return { success: false, error: 'Insufficient permissions to update target' };
  }

  const { target_id, ...updates } = input;

  if (updates.target_value !== undefined) {
    const valError = validateTargetValue(updates.target_value);
    if (valError) return { success: false, error: valError };
  }

  if (updates.period_start !== undefined && updates.period_end !== undefined) {
    const periodError = validatePeriod(updates.period_start, updates.period_end);
    if (periodError) return { success: false, error: periodError };
  } else if (updates.period_start !== undefined || updates.period_end !== undefined) {
    // Need both to validate
    const { data: existing } = await supabase
      .from('sales_targets')
      .select('period_start, period_end')
      .eq('id', target_id)
      .single();
    if (existing) {
      const periodError = validatePeriod(
        updates.period_start ?? existing.period_start,
        updates.period_end ?? existing.period_end
      );
      if (periodError) return { success: false, error: periodError };
    }
  }

  if (updates.metric !== undefined) {
    const validMetrics: ('CUSTOMER_INTERACTIONS' | 'ENQUIRIES' | 'JOBS')[] = ['CUSTOMER_INTERACTIONS', 'ENQUIRIES', 'JOBS'];
    if (!validMetrics.includes(updates.metric)) {
      return { success: false, error: 'Invalid metric' };
    }
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sales_targets')
    .update({
      ...updates,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('id', target_id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Target already exists for this salesperson, metric, and period' };
    }
    console.error('Update target error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, target: data as SalesTarget };
}

const VALID_SORT_COLUMNS: (keyof SalesTarget)[] = [
  'metric',
  'target_value',
  'period_start',
  'period_end',
  'created_at',
  'updated_at',
];

async function listTargetsBase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  canReadTeam: boolean,
  canReadAll: boolean,
  params: ListTargetsParams
): Promise<ListTargetsResult> {
  const {
    page = 0,
    pageSize = 20,
    salespersonId,
    metric,
    periodStart,
    periodEnd,
  } = params;

  const cappedPageSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = page * cappedPageSize;

  let query = supabase.from('sales_targets').select('*', { count: 'exact' });

  if (salespersonId) {
    if (canReadAll) {
      query = query.eq('salesperson_id', salespersonId);
    } else if (canReadTeam) {
      const { data: teamMember } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('user_id', salespersonId)
        .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id)
        .maybeSingle();

      if (!teamMember) {
        return { success: false, error: 'Salesperson not found in your team' };
      }
      query = query.eq('salesperson_id', salespersonId);
    } else {
      return { success: false, error: 'Insufficient permissions' };
    }
  } else if (canReadAll) {
    // no filter
  } else if (canReadTeam) {
    const { data: teamMembers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'salesperson').single()).data?.id);

    const teamIds = (teamMembers ?? []).map(m => m.user_id).filter(id => id !== userId);
    if (teamIds.length === 0) {
      return { success: true, targets: [], totalCount: 0 };
    }
    query = query.in('salesperson_id', teamIds);
  } else {
    query = query.eq('salesperson_id', userId);
  }

  if (metric) query = query.eq('metric', metric);
  if (periodStart) query = query.gte('period_start', periodStart);
  if (periodEnd) query = query.lte('period_end', periodEnd);

  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + cappedPageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('List targets error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    targets: (data ?? []) as SalesTarget[],
    totalCount: count ?? 0,
  };
}

export async function getOwnTargets(params: ListTargetsParams = {}): Promise<ListTargetsResult> {
  const supabase = createClient();
  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) return { success: false, error: authError ?? 'Unauthorized' };
  if (!permissions.includes(PERMISSIONS.TARGET.READ_OWN)) return { success: false, error: 'Insufficient permissions' };
  return listTargetsBase(supabase, user.id, false, false, params);
}

export async function getTeamTargets(params: ListTargetsParams = {}): Promise<ListTargetsResult> {
  const supabase = createClient();
  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) return { success: false, error: authError ?? 'Unauthorized' };
  const canReadTeam = permissions.includes(PERMISSIONS.TARGET.READ_TEAM);
  const canReadAll = permissions.includes(PERMISSIONS.TARGET.READ_ALL);
  if (!canReadTeam && !canReadAll) return { success: false, error: 'Insufficient permissions' };
  return listTargetsBase(supabase, user.id, canReadTeam, canReadAll, params);
}

export async function getAllTargets(params: ListTargetsParams = {}): Promise<ListTargetsResult> {
  const supabase = createClient();
  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) return { success: false, error: authError ?? 'Unauthorized' };
  if (!permissions.includes(PERMISSIONS.TARGET.READ_ALL)) return { success: false, error: 'Insufficient permissions' };
  return listTargetsBase(supabase, user.id, true, true, params);
}

export async function getTargetsWithProgress(params: ListTargetsWithProgressParams = {}): Promise<ListTargetsWithProgressResult> {
  const supabase = createClient();
  const { user, permissions, error: authError } = await getUserAndPermissions(supabase);
  if (authError || !user) return { success: false, error: authError ?? 'Unauthorized' };

  const canReadOwn = permissions.includes(PERMISSIONS.TARGET.READ_OWN);
  const canReadTeam = permissions.includes(PERMISSIONS.TARGET.READ_TEAM);
  const canReadAll = permissions.includes(PERMISSIONS.TARGET.READ_ALL);

  if (!canReadOwn && !canReadTeam && !canReadAll) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const listResult = await listTargetsBase(supabase, user.id, canReadTeam, canReadAll, params);
  if (listResult.success === false) {
    return { success: false as const, error: listResult.error };
  }

  const targetsWithProgress: TargetWithProgress[] = await Promise.all(
    listResult.targets.map(async (target) => {
      const progress = await calculateProgress(supabase, target.salesperson_id, target.period_start, target.period_end);
      const metricKey = target.metric.toLowerCase() as keyof TargetProgress;
      const achieved = progress[metricKey] ?? 0;
      const achievement_percentage = target.target_value > 0 ? Math.round((achieved / target.target_value) * 100) : 0;
      return {
        ...target,
        progress,
        achievement_percentage,
      };
    })
  );

  return {
    success: true,
    targets: targetsWithProgress,
    totalCount: listResult.totalCount,
  };
}