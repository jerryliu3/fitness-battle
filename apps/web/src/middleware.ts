import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const LEGACY_TABS: Record<string, string> = {
  "/": "/today",
  "/board": "/arena",
  "/splits": "/today",
  "/progress": "/you",
};

export async function middleware(request: NextRequest) {
  const target = LEGACY_TABS[request.nextUrl.pathname];
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
