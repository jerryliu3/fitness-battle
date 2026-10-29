import { NextResponse, type NextRequest } from "next/server";
import { updateSession, updateSessionAndGetUser } from "@/lib/supabase/middleware";
import {
  DEMO_USER_COOKIE,
  isAuthorizedForDesign,
  isDesignOrUxPath,
  isLocalEnvironment,
  parseDemoUserFromCookie,
} from "@/lib/auth/design-access";
import {
  isAdminPath,
  isAuthorizedForAdmin,
  normalizeAdminPath,
} from "@/lib/auth/admin-access";
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
  "rankings",
] as const;

interface ResolvedAuth {
  response: NextResponse;
  authEmail: string | null;
  authMode: "supabase" | "demo";
  isLocal: boolean;
}

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

async function resolveRequestAuth(request: NextRequest): Promise<ResolvedAuth> {
  const { response, user } = await updateSessionAndGetUser(request);
  const isLocal = isLocalEnvironment({ hostname: request.nextUrl.hostname });

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

  return { response, authEmail, authMode, isLocal };
}

function redirectToLogin(request: NextRequest, sessionResponse: NextResponse): NextResponse {
  const loginUrl = new URL("/login", request.nextUrl);
  loginUrl.search = `?next=${encodeURIComponent(
    request.nextUrl.pathname + request.nextUrl.search,
  )}`;
  const redirectResponse = NextResponse.redirect(loginUrl);
  copyCookies(sessionResponse, redirectResponse);
  return redirectResponse;
}

function redirectToDenied(request: NextRequest, sessionResponse: NextResponse, reason: string): NextResponse {
  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = webProductPath("/today");
  targetUrl.search = `?denied=${encodeURIComponent(reason)}`;
  const redirectResponse = NextResponse.redirect(targetUrl);
  copyCookies(sessionResponse, redirectResponse);
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const aliasTarget = LEGACY_TAB_ALIASES[pathname];
  if (aliasTarget) {
    const url = request.nextUrl.clone();
    url.pathname = webProductPath(aliasTarget);
    return NextResponse.redirect(url);
  }

  if (isAdminPath(pathname)) {
    const { response, authEmail, authMode, isLocal } = await resolveRequestAuth(request);

    if (!authEmail) {
      return redirectToLogin(request, response);
    }

    if (!isAuthorizedForAdmin({ email: authEmail, mode: authMode, isLocal })) {
      return redirectToDenied(request, response, "admin");
    }

    const normalized = normalizeAdminPath(pathname);
    if (normalized === "/admin" || normalized.startsWith("/admin/")) {
      const subpath = normalized.slice("/admin".length);
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = `/app/admin${subpath}`;
      const redirectResponse = NextResponse.redirect(targetUrl);
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  }

  for (const segment of PRODUCT_SEGMENTS) {
    if (pathname === `/${segment}` || pathname.startsWith(`/${segment}/`)) {
      return redirectProductPath(request, pathname);
    }
  }

  if (isDesignOrUxPath(pathname)) {
    const { response, authEmail, authMode, isLocal } = await resolveRequestAuth(request);

    if (!authEmail) {
      return redirectToLogin(request, response);
    }

    if (!isAuthorizedForDesign({ email: authEmail, mode: authMode, isLocal })) {
      return redirectToDenied(request, response, "design");
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
    "/admin/:path*",
    "/app/admin/:path*",
  ],
};
