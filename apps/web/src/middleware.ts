import { NextResponse, type NextRequest } from "next/server";
import { updateSession, updateSessionAndGetUser } from "@/lib/supabase/middleware";
import {
  DEMO_USER_COOKIE,
  isAuthorizedForDesign,
  isDesignOrUxPath,
  isLocalEnvironment,
  parseDemoUserFromCookie,
} from "@/lib/auth/design-access";

const LEGACY_TABS: Record<string, string> = {
  "/": "/today",
  "/board": "/arena",
  "/splits": "/today",
  "/progress": "/you",
};

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function middleware(request: NextRequest) {
  const target = LEGACY_TABS[request.nextUrl.pathname];
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  const { pathname, hostname } = request.nextUrl;

  if (isDesignOrUxPath(pathname)) {
    const { response, user } = await updateSessionAndGetUser(request);
    const isLocal = isLocalEnvironment({ hostname });

    let authEmail: string | null = user?.email ?? null;
    let authMode: "supabase" | "demo" = "supabase";

    // On local development, check demo user cookie if no Supabase session exists
    if (!authEmail && isLocal) {
      const demoCookie = request.cookies.get(DEMO_USER_COOKIE)?.value;
      const demoUser = parseDemoUserFromCookie(demoCookie);
      if (demoUser?.email) {
        authEmail = demoUser.email;
        authMode = "demo";
      }
    }

    // Unauthenticated: redirect to login with next path
    if (!authEmail) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = `?next=${encodeURIComponent(
        request.nextUrl.pathname + request.nextUrl.search,
      )}`;
      const redirectResponse = NextResponse.redirect(loginUrl);
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }

    // Check authorization for design / ux
    const authorized = isAuthorizedForDesign({
      email: authEmail,
      mode: authMode,
      isLocal,
    });

    if (!authorized) {
      // Authenticated but unauthorized: redirect to /today with denied notice
      const todayUrl = request.nextUrl.clone();
      todayUrl.pathname = "/today";
      todayUrl.search = "?denied=design";
      const redirectResponse = NextResponse.redirect(todayUrl);
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

