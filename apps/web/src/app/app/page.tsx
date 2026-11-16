"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { GUEST_INTRO_SEEN_KEY } from "@fitness-battle/shared";
import { AppParagraph } from "@/ui/section";

export default function AppEntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading || user) return;
    let seen = false;
    try { seen = localStorage.getItem(GUEST_INTRO_SEEN_KEY) === "1"; } catch {}
    router.replace(seen ? "/app/today" : "/app/welcome");
  }, [user, loading, router]);
  return <AppParagraph>Loading…</AppParagraph>;
}
