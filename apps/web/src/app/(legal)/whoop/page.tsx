import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WHOOP · Fitness Battle",
  description:
    "Connect WHOOP to Fitness Battle to sync recovery and workouts into group and 1v1 battles.",
};

/**
 * Public app link for the WHOOP developer dashboard / OAuth consent screen.
 * OAuth redirect stays at /api/fitness/whoop/callback (server token exchange).
 */
export default function WhoopAppPage() {
  return (
    <article className="fb-legal-doc">
      <p className="fb-kicker">Fitness Battle</p>
      <h1 className="fb-title">WHOOP</h1>
      <p className="fb-copy">
        Fitness Battle uses WHOOP so you can bring recovery and workouts into
        weekly battles with friends.
      </p>

      <h2>What connecting does</h2>
      <ul>
        <li>Syncs workouts you record on WHOOP into your battle scoring</li>
        <li>Pulls recovery so readiness can show alongside effort</li>
        <li>Stores OAuth tokens on our server until you disconnect</li>
      </ul>

      <h2>Your control</h2>
      <p>
        Connect or disconnect from Athlete after you sign in. You can also revoke
        Fitness Battle in your WHOOP account at any time. See our{" "}
        <Link href="/privacy">Privacy Policy</Link> for how we handle WHOOP data.
      </p>

      <p className="fb-legal-actions">
        <Link href="/login?next=/you" className="fb-btn">
          Sign in to connect
        </Link>
        <Link href="/privacy" className="fb-legal-secondary">
          Privacy Policy
        </Link>
      </p>
    </article>
  );
}
