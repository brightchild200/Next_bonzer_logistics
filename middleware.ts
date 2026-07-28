import { NextResponse,type NextRequest } from 'next/server';
import { updateSession } from '@/lib/db/middleware';
import { createServerClient } from '@supabase/ssr';


function getPathname(request: NextRequest) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.nextUrl.pathname;
  }
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = getPathname(request);

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/login') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/set-password') ||
    pathname.startsWith('/api/auth');

  if (isPublic) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirectTo', pathname);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const { data: ctx, error: ctxError } = await supabase.rpc('get_my_auth_context');

  const roles: string[] = Array.isArray(ctx?.roles) ? ctx.roles : [];
  const profile = ctx?.profile;

  if (profile && profile.is_active === false) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Your account has been deactivated. Please contact your administrator.');
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const isAuthorized = !ctxError && roles.length > 0;

  if (!isAuthorized) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirectTo', pathname);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
