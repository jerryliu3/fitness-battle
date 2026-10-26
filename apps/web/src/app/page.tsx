import { AppHeading, AppParagraph } from "@/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import "@/features/club/auth.css";

export const metadata: Metadata = {
  title: "Overtaek — Compete on effort",
  description:
    "Weekly fitness fields, crew progress, and automatic scoring from the trackers you already use.",
};

export default function MarketingHomePage() {
  return (
    <div className="fb fb-legal fb-marketing">
      <header className="fb-legal-header">
        <Link href="/" className="fb-legal-brand">
          overtaek
        </Link>
        <nav className="fb-legal-nav" aria-label="Site">
          <Link href="/support">Support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main className="fb-legal-main fb-marketing-main">
        <AppParagraph typographyRole="label" className="fb-kicker">
          Fitness battles
        </AppParagraph>
        <AppHeading level={1} role="display" className="fb-title">
          A little further, together.
        </AppHeading>
        <AppParagraph typographyRole="body" className="fb-copy">
          Overtaek turns your real workouts into weekly fields, crew progress,
          and honest standings — synced from Apple Health, Health Connect, and
          the trackers you already trust.
        </AppParagraph>
        <div className="fb-marketing-actions">
          <Link href="/app/today" className="fb-btn">
            Open the app
          </Link>
          <Link href="/signup" className="fb-btn-line">
            Create account
          </Link>
        </div>
        <AppParagraph typographyRole="caption" className="fb-note">
          <Link href="/terms">Terms</Link>
          {" · "}
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/support">Support & account help</Link>
        </AppParagraph>
      </main>
    </div>
  );
}
