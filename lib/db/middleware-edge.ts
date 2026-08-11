import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SUPABASE_AUTH_COOKIE_NAME = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

function createEdgeSupabaseClient(request: NextRequest, response: NextResponse): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: SUPABASE_AUTH_COOKIE_NAME,
      storage: {
        getItem(key) {
          return request.cookies.get(key)?.value ?? null;
        },
        setItem(key, value) {
          response.cookies.set(key, value, {
            path: '/',
            sameSite: 'lax',
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
          });
        },
        removeItem(key) {
          response.cookies.delete(key);
        },
      },
    },
  });
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createEdgeSupabaseClient(request, response);

  await supabase.auth.getUser();

  return response;
}