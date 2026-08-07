'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { InteractionAttachment } from '../types';

export interface CreateAttachmentInput {
  interactionId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

export type CreateAttachmentResult =
  | {
      success: true;
      attachment: InteractionAttachment;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Persists an attachment row for an interaction after the file has been
 * uploaded to the `customer-interactions` storage bucket.
 */
export async function createAttachment(
  input: CreateAttachmentInput
): Promise<CreateAttachmentResult> {
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

  if (!userPermissions.includes(PERMISSIONS.INTERACTION.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.interactionId) {
    return { success: false, error: 'Interaction ID is required' };
  }

  if (!input.storagePath || !input.storagePath.trim()) {
    return { success: false, error: 'Storage path is required' };
  }

  if (input.fileSize <= 0) {
    return { success: false, error: 'Invalid file size' };
  }

  const { data: interaction, error: interactionError } = await supabase
    .from('customer_interactions')
    .select('id, is_active')
    .eq('id', input.interactionId)
    .single();

  if (interactionError || !interaction) {
    return { success: false, error: 'Interaction not found' };
  }

  if (!interaction.is_active) {
    return { success: false, error: 'Cannot attach files to an inactive interaction' };
  }

  const now = new Date().toISOString();

  const { data: attachment, error: insertError } = await supabase
    .from('interaction_attachments')
    .insert({
      interaction_id: input.interactionId,
      storage_path: input.storagePath,
      original_name: input.originalName,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      uploaded_by: user.id,
      uploaded_at: now,
      created_at: now,
    })
    .select()
    .single();

  if (insertError || !attachment) {
    console.error('[createAttachment] Insert error:', insertError);
    return { success: false, error: 'Failed to save attachment metadata' };
  }

  return {
    success: true,
    attachment: attachment as InteractionAttachment,
  };
}
