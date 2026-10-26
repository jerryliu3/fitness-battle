import { NextResponse, type NextRequest } from "next/server";
import { updateSession, updateSessionAndGetUser } from "@/lib/supabase/middleware";
import {
  DEMO_USER_COOKIE,
  isAuthorizedForDesign,
  isDesignOrUxPath,
  isLocalEnvironment,
  parseDemoUserFromCookie,
} from "@/lib/auth/design-access";
import { webProductPath } from "@fitness-battle/shared";

const LEGACY_TAB_ALIASES: Record<string, string> = {
  "/board": "/arena",
  "/splits": "/today",
  "/progress": "/you",
};

const PRODUCT_SEGMENTS = [
  "today",
  "arena",
  "you",
  "field",
  "athlete",
  "onboarding",
  "week",
  "pace",
  "admin",
  "rankings",
] as const;

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function redirectProductPath(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = webProductPath(pathname);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const aliasTarget = LEGACY_TAB_ALIASES[pathname];
  if (aliasTarget) {
    const url = request.nextUrl.clone();
    url.pathname = webProductPath(aliasTarget);
    return NextResponse.redirect(url);
  }

  for (const segment of PRODUCT_SEGMENTS) {
    if (pathname === `/${segment}` || pathname.startsWith(`/${segment}/`)) {
      return redirectProductPath(request, pathname);
    }
  }

  const { hostname } = request.nextUrl;

  if (isDesignOrUxPath(pathname)) {
    const { response, user } = await updateSessionAndGetUser(request);
    const isLocal = isLocalEnvironment({ hostname });

    let authEmail: string | null = user?.email ?? null;
    let authMode: "supabase" | "demo" = "supabase";

    if (!authEmail && isLocal) {
      const demoCookie = request.cookies.get(DEMO_USER_COOKIE)?.value;
      const demoUser = parseDemoUserFromCookie(demoCookie);
      if (demoUser?.email) {
        authEmail = demoUser.email;
        authMode = "demo";
      }
    }

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

    const authorized = isAuthorizedForDesign({
      email: authEmail,
      mode: authMode,
      isLocal,
    });

    if (!authorized) {
      const todayUrl = request.nextUrl.clone();
      todayUrl.pathname = webProductPath("/today");
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
    "/design/:path*",
    "/ux/:path*",
  ],
};
