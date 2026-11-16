"use client";

import { Suspense } from "react";
import { OnboardingNavigation } from "@/components/onboarding-navigation";
import { CompeteProvider } from "@/components/compete-context";
import { NotificationTriggers } from "@/components/notification-triggers";
import { PhoneShell } from "@/shell/phone-shell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";
import "@/features/rally/rally-shell.css";
import "@/features/rally/product.css";
import "@/features/focus/focus.css";
import "@/features/focus/club.css";
import "@/ui/product-typography.css";

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const hideTabs =
    path.startsWith("/app/onboarding") || path.startsWith("/onboarding") || path.startsWith("/app/welcome");
  return <PhoneShell hideTabs={hideTabs}>{children}</PhoneShell>;
}

export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <CompeteProvider>
      <Suspense fallback={null}><OnboardingNavigation /></Suspense>
      <NotificationTriggers />
      <PlayChrome>{children}</PlayChrome>
    </CompeteProvider>
  );
}
