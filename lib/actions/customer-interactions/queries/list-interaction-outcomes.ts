'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { InteractionOutcome } from '../types';

type InteractionOutcomeRow = {
  id: string;
  code: InteractionOutcome['code'];
  name: string;
  description: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface ListInteractionOutcomesResult {
  success: true;
  outcomes: InteractionOutcome[];
}

export interface ListInteractionOutcomesError {
  success: false;
  error: string;
}

export type ListInteractionOutcomesResponse = ListInteractionOutcomesResult | ListInteractionOutcomesError;

export async function listInteractionOutcomes(): Promise<ListInteractionOutcomesResponse> {
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

  if (!userPermissions.includes('interaction:read_all')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('interaction_outcomes')
    .select('id, code, name, description, display_order, is_system, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[listInteractionOutcomes] Query error:', error);
    return { success: false, error: 'Failed to fetch interaction outcomes' };
  }

  return {
    success: true,
    outcomes: (data ?? []).map((outcome) => {
      const row = outcome as InteractionOutcomeRow;
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        displayOrder: row.display_order,
        isSystem: row.is_system,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies InteractionOutcome;
    }),
  };
}