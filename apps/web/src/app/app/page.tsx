"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { AppParagraph } from "@/ui/section";

export default function AppEntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading || user) return;
    router.replace("/app/welcome");
  }, [user, loading, router]);
  return <AppParagraph>Loading…</AppParagraph>;
}
