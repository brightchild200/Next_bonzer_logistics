'use server';

import { createClient } from '@/lib/db/server';
import { getAuthContext, type AuthContext } from '@/lib/auth/server-auth';

export interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  owner_id: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface GetActivitiesResult {
  success: true;
  activities: ActivityLog[];
}

export interface GetActivitiesError {
  success: false;
  error: string;
}

export type GetActivitiesResponse = GetActivitiesResult | GetActivitiesError;

export async function getActivities(limit = 8): Promise<GetActivitiesResponse> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, description, owner_id, entity_type, entity_id, created_at')
    .eq('owner_id', authContext.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: 'Failed to fetch activities' };
  }

  return {
    success: true,
    activities: (data ?? []) as ActivityLog[],
  };
}