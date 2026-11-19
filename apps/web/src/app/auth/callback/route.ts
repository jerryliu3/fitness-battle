import { NextResponse } from "next/server";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const from = url.searchParams.get("from");
  const next = resolveSafePostLoginPath(url.searchParams.get("next"));

  function redirectWithError(message: string) {
    const authPath = from === "signup" ? "/signup" : "/login";
    const target = new URL(authPath, url.origin);
    target.searchParams.set("next", next);
    if (from === "onboarding") {
      target.searchParams.set("from", "onboarding");
    }
    target.searchParams.set("error", message);
    return NextResponse.redirect(target);
  }

  if (error || errorDescription) {
    const message = (errorDescription || error || "Sign-in was cancelled.").replace(
      /\+/g,
      " ",
    );
    return redirectWithError(message);
  }

  if (!code) {
    return redirectWithError("Missing authorization code from sign-in.");
  }

  const { configured } = getSupabaseConfig();
  if (!configured) {
    return redirectWithError(
      "Google and Apple sign-in require a configured Supabase project.",
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return redirectWithError(exchangeError.message || "Could not complete sign-in.");
  }

  const destination =
    from === "onboarding" || from === "signup"
      ? `/app/onboarding?next=${encodeURIComponent(next)}`
      : next;

  return NextResponse.redirect(new URL(destination, url.origin));
}
