'use server';

import { unstable_cache } from 'next/cache';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
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

async function fetchInteractionOutcomes(): Promise<InteractionOutcome[]> {
  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('interaction_outcomes')
    .select('id, code, name, description, display_order, is_system, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[listInteractionOutcomes] Query error:', error);
    throw new Error('Failed to fetch interaction outcomes');
  }

  return (data ?? []).map((outcome) => {
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
  });
}

const getCachedInteractionOutcomes = unstable_cache(
  fetchInteractionOutcomes,
  ['interaction-outcomes'],
  { revalidate: 3600, tags: ['interaction-outcomes'] }
);

export async function listInteractionOutcomes(): Promise<ListInteractionOutcomesResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  const canReadInteraction =
    hasPermission(authContext, PERMISSIONS.INTERACTION.READ_ALL) ||
    hasPermission(authContext, PERMISSIONS.INTERACTION.READ_OWN) ||
    hasPermission(authContext, PERMISSIONS.INTERACTION.CREATE);

  if (!canReadInteraction) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const outcomes = await getCachedInteractionOutcomes();
    return { success: true, outcomes };
  } catch {
    return { success: false, error: 'Failed to fetch interaction outcomes' };
  }
}