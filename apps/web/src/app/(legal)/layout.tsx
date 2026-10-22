import "@/features/club/auth.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal · overtaek",
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fb fb-legal">
      <header className="fb-legal-header">
        <Link href="/" className="fb-legal-brand">
          overtaek
        </Link>
        <nav className="fb-legal-nav" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main className="fb-legal-main">{children}</main>
    </div>
  );
}
