"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { isCompeteDataReady } from "@fitness-battle/shared/boot";
import { useBootLoading } from "./boot-readiness";

/** Hold the launch cover until auth and compete account hydration settle. */
export function ShellBootReadiness() {
  const { loading } = useAuth();
  const { loadStatus, state } = useCompete();
  useBootLoading(loading || !isCompeteDataReady(loadStatus, state));
  return null;
}
