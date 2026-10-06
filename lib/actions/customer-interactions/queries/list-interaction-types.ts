'use server';

import { unstable_cache } from 'next/cache';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { InteractionType } from '../types';

type InteractionTypeRow = {
  id: string;
  code: InteractionType['code'];
  name: string;
  description: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface ListInteractionTypesResult {
  success: true;
  types: InteractionType[];
}

export interface ListInteractionTypesError {
  success: false;
  error: string;
}

export type ListInteractionTypesResponse = ListInteractionTypesResult | ListInteractionTypesError;

async function fetchInteractionTypes(): Promise<InteractionType[]> {
  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('interaction_types')
    .select('id, code, name, description, display_order, is_system, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[listInteractionTypes] Query error:', error);
    throw new Error('Failed to fetch interaction types');
  }

  return (data ?? []).map((type) => {
    const row = type as InteractionTypeRow;
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
    } satisfies InteractionType;
  });
}

const getCachedInteractionTypes = unstable_cache(
  fetchInteractionTypes,
  ['interaction-types'],
  { revalidate: 3600, tags: ['interaction-types'] }
);

export async function listInteractionTypes(): Promise<ListInteractionTypesResponse> {
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
    const types = await getCachedInteractionTypes();
    return { success: true, types };
  } catch {
    return { success: false, error: 'Failed to fetch interaction types' };
  }
}