'use server';

import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { InteractionType, InteractionOutcome } from '../types';

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

export interface GetInteractionTypeResult {
  success: true;
  type: InteractionType;
}

export interface GetInteractionTypeError {
  success: false;
  error: string;
}

export type GetInteractionTypeResponse = GetInteractionTypeResult | GetInteractionTypeError;

export async function getInteractionType(
  typeId: string
): Promise<GetInteractionTypeResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.INTERACTION.READ_ALL)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('interaction_types')
    .select('id, code, name, description, display_order, is_system, is_active, created_at, updated_at')
    .eq('id', typeId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Interaction type not found' };
  }

  const row = data as InteractionTypeRow;

  return {
    success: true,
    type: {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
      isSystem: row.is_system,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

export interface GetInteractionOutcomeResult {
  success: true;
  outcome: InteractionOutcome;
}

export interface GetInteractionOutcomeError {
  success: false;
  error: string;
}

export type GetInteractionOutcomeResponse = GetInteractionOutcomeResult | GetInteractionOutcomeError;

export async function getInteractionOutcome(
  outcomeId: string
): Promise<GetInteractionOutcomeResponse> {
  const authResult = await getAuthContext();

  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.INTERACTION.READ_ALL)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { createClient } = await import('@/lib/db/server');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('interaction_outcomes')
    .select('id, code, name, description, display_order, is_system, is_active, created_at, updated_at')
    .eq('id', outcomeId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Interaction outcome not found' };
  }

  const row = data as InteractionOutcomeRow;

  return {
    success: true,
    outcome: {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
      isSystem: row.is_system,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}