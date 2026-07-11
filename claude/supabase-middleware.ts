// lib/supabase/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.delete(name);
        },
      },
    }
  );

  // This refreshes a user's session indirectly
  await supabase.auth.getUser();

  return supabaseResponse;
}
