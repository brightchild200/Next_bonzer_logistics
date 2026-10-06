'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type { InteractionLocation } from '../types';

export interface ReverseGeocodeResult {
  displayName: string;
  address: Record<string, string>;
}

export interface CreateLocationInput {
  interactionId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt?: string;
  reverseGeocoded?: ReverseGeocodeResult | null;
}

export type CreateLocationResult =
  | {
      success: true;
      location: InteractionLocation & { formattedAddress: string | null };
    }
  | {
      success: false;
      error: string;
    };

/**
 * Reverse-geocodes coordinates using LocationIQ (optional; graceful fallback).
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL('https://us1.locationiq.com/v1/reverse');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'json');
    url.searchParams.set('normalizeaddress', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error('[createLocation] LocationIQ error status:', res.status);
      return null;
    }

    const data = await res.json();

    if (!data || typeof data.display_name !== 'string') {
      return null;
    }

    return {
      displayName: data.display_name,
      address: (data.address && typeof data.address === 'object' ? data.address : {}) as Record<string, string>,
    };
  } catch (err) {
    console.error('[createLocation] Reverse-geocode failed:', err);
    return null;
  }
}

/**
 * Persists a captured location for an interaction and stores the optional
 * LocationIQ reverse-geocoded address.
 */
export async function createLocation(
  input: CreateLocationInput
): Promise<CreateLocationResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const authContext: AuthContext = authResult.authContext;
  const userId = authContext.userId;

  if (!hasPermission(authContext, PERMISSIONS.INTERACTION.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!input.interactionId) {
    return { success: false, error: 'Interaction ID is required' };
  }

  if (
    typeof input.latitude !== 'number' ||
    Number.isNaN(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return { success: false, error: 'Invalid latitude' };
  }

  if (
    typeof input.longitude !== 'number' ||
    Number.isNaN(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return { success: false, error: 'Invalid longitude' };
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
    return { success: false, error: 'Cannot add location to an inactive interaction' };
  }

  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const now = new Date().toISOString();

 let formattedAddress: string | null = null;
  if (input.reverseGeocoded) {
    formattedAddress = input.reverseGeocoded.displayName;
  } else {
    const geo = await reverseGeocode(input.latitude, input.longitude);
    formattedAddress = geo?.displayName ?? null;
  }

const { data: location, error: insertError } = await supabase
    .from('interaction_locations')
    .insert({
      interaction_id: input.interactionId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      formatted_address: formattedAddress,
      captured_at: capturedAt,
      captured_by: userId,
      created_at: now,
    })
    .select()
    .single();

  if (insertError || !location) {
    console.error('[createLocation] Insert error:', insertError);
    return { success: false, error: 'Failed to save location' };
  }

  return {
    success: true,
    location: {
      ...(location as InteractionLocation),
      formattedAddress,
    },
  };
}
