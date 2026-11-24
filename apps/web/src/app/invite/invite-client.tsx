"use client";

import { useAuth } from "@/components/auth-context";
import { OpenInAppBanner } from "@/components/open-in-app-banner";
import { crewInviteNativePath, crewInviteWebDestination } from "@fitness-battle/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function InviteClient({ code }: { code: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const destination = crewInviteWebDestination(code);
  const nativePath = crewInviteNativePath(code);

  useEffect(() => {
    if (loading) return;
    router.replace(destination);
  }, [destination, loading, router]);

  return <OpenInAppBanner nativePath={nativePath} label="Open invite" />;
}