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
  if (path === "/app/pace" || path.startsWith("/app/pace/")) return children;
  // The guest journey does not need the account shell's startup animation or tab warmup.
  if (path === "/app/welcome") {
    return <div className="phone-frame"><div className="phone-shell" style={{ overflowY: "auto" }}>
      <div role="main" className="phone-main phone-main-solo" style={{ margin: "0 auto" }}>{children}</div>
    </div></div>;
  }
  const hideTabs = path.startsWith("/app/onboarding") || path.startsWith("/onboarding");
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
