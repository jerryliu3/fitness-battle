"use client";

import { PHONE_TABS } from "@fitness-battle/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Warm the four tabs after the first paint, the way a phone keeps them ready. */
export function useTabCache() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const tab of PHONE_TABS) router.prefetch(tab.href);
      router.prefetch("/progress");
      router.prefetch("/pace");
    }, 500);
    return () => window.clearTimeout(id);
  }, [router]);
}
