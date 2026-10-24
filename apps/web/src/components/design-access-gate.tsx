"use client";
import { AppParagraph, AppHeading } from "@/ui/section";


import { useAuth } from "@/components/auth-context";
import { isAuthorizedForDesign, isLocalHost } from "@/lib/auth/design-access";
import { buildLoginHref } from "@/lib/auth/login-redirect";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function DesignAccessGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
      <main style={{ padding: "48px 16px", maxWidth: 480, margin: "0 auto" }}>
        <AppParagraph typographyRole="body" className="fb-copy">Checking access…</AppParagraph>
      </main>
    );
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = isLocalHost(hostname);
  const authorized = isAuthorizedForDesign({
    email: user?.email,
    mode: user?.mode,
    isLocal,
  });

  if (!user) {
    return (
      <main style={{ padding: "48px 16px", maxWidth: 480, margin: "0 auto" }}>
        <section className="fb-card fb-auth-wall">
          <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Restricted Access</AppParagraph>
          <AppHeading level={1} role="pageTitle" className="fb-title">Sign in required</AppHeading>
          <AppParagraph typographyRole="body" className="fb-copy">
            Design lab and UX study prototypes are restricted. Please sign in with an authorized account.
          </AppParagraph>
          <div className="fb-stack">
            <Link href={buildLoginHref(pathname)} className="fb-btn">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={{ padding: "48px 16px", maxWidth: 480, margin: "0 auto" }}>
        <section className="fb-card fb-auth-wall">
          <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Restricted Access</AppParagraph>
          <AppHeading level={1} role="pageTitle" className="fb-title">Access denied</AppHeading>
          <AppParagraph typographyRole="body" className="fb-copy">
            The design lab is restricted to <strong>3jerryliu@gmail.com</strong>
            {isLocal ? " (or demo accounts on local)" : ""}. You are signed in as{" "}
            <strong>{user.email}</strong>.
          </AppParagraph>
          <div className="fb-stack">
            <Link href="/today" className="fb-btn">
              Back to app
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="fb-btn-line"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
