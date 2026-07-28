'use server';

import { createClient } from '@/lib/db/server';
import type { Permission } from '@/lib/auth/permissions';
import type { InteractionFollowup } from '../types';

type FollowupRow = {
  id: string;
  followup_ref: string;
  interaction_id: string;
  due_at: string;
  status: InteractionFollowup['status'];
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export interface GetFollowupsResult {
  success: true;
  followups: InteractionFollowup[];
}

export interface GetFollowupsError {
  success: false;
  error: string;
}

export type GetFollowupsResponse = GetFollowupsResult | GetFollowupsError;

export async function getFollowups(
  interactionId: string
): Promise<GetFollowupsResponse> {
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

  if (!userPermissions.includes('follow_up:read_all')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('interaction_followups')
    .select(
      `
      id,
      followup_ref,
      interaction_id,
      due_at,
      status,
      completion_notes,
      completed_at,
      completed_by,
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_active
      `
    )
    .eq('interaction_id', interactionId)
    .order('due_at', { ascending: true });

  if (error) {
    console.error('[getFollowups] Query error:', error);
    return { success: false, error: 'Failed to fetch follow-ups' };
  }

  return {
    success: true,
    followups: (data ?? []).map((followup) => {
      const row = followup as FollowupRow;
      return {
        id: row.id,
        followupRef: row.followup_ref,
        interactionId: row.interaction_id,
        dueAt: row.due_at,
        status: row.status,
        completionNotes: row.completion_notes,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: row.is_active,
      } satisfies InteractionFollowup;
    }),
  };
}