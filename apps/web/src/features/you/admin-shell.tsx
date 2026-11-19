"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { webProductPath } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { isAdminEmail } from "@/lib/auth/admin-access";
import { buildLoginHref } from "@/lib/auth/login-redirect";
import { AppHeading, AppParagraph } from "@/ui/section";

const NAV = [
  { href: "/app/admin", label: "Round lab", match: (path: string) => path === "/app/admin" },
  { href: "/app/admin/routes", label: "Routes", match: (path: string) => path.startsWith("/app/admin/routes") },
  { href: "/app/admin/waves", label: "Waves", match: (path: string) => path.startsWith("/app/admin/waves") },
] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace(buildLoginHref(path));
      else if (!isAdminEmail(user.email)) router.replace(webProductPath("/today?denied=admin"));
    }
  }, [loading, user, router, path]);

  if (loading || !user || !isAdminEmail(user.email)) return null;

  return (
    <main className="fb-card" style={{ padding: 24, maxWidth: 1120, margin: "auto" }}>
      <style>{`@media (max-width: 720px) { .admin-split { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
      <AppHeading level={1} role="display">Admin</AppHeading>
      <nav aria-label="Admin sections" className="focus-actions" style={{ margin: "16px 0 24px", flexWrap: "wrap" }}>
        {NAV.map(item => {
          const active = item.match(path);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "fb-btn" : "fb-btn-line"}
              aria-current={active ? "page" : undefined}
              style={{ textDecoration: "none" }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <AppHeading level={2} role="heading">{title}</AppHeading>
      {user.mode !== "supabase" ? <AppParagraph typographyRole="body">Supabase mode is required for production route and wave tools.</AppParagraph> : children}
    </main>
  );
}