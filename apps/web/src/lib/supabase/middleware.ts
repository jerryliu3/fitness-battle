import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSessionAndGetUser(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  const { supabaseUrl, supabaseAnonKey, configured } = getSupabaseConfig();
  if (!configured) {
    return { response: NextResponse.next({ request }), user: null };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, user: data.user ?? null };
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { response } = await updateSessionAndGetUser(request);
  return response;
}
