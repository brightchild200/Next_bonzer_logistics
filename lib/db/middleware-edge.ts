import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { nowMs } from '@/lib/perf/timing';

export async function updateSession(request: NextRequest) {
  const traceId = Math.random().toString(36).substring(2, 10);
  const totalStart = nowMs();
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const authStart = nowMs();
  try {
    await supabase.auth.getUser();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[PERF][MIDDLEWARE][${traceId}] auth.getUser failed; continuing without refresh`, error);
    }
  }
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PERF][MIDDLEWARE][${traceId}] auth.getUser: ${Math.round(nowMs() - authStart)}ms`);
    console.log(`[PERF][MIDDLEWARE][${traceId}] updateSession total: ${Math.round(nowMs() - totalStart)}ms`);
  }

  return supabaseResponse;
}
