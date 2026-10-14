import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use · Fitness Battle",
  description:
    "Terms for using the Fitness Battle web and mobile apps, including account, fitness data, and competitions.",
};

const UPDATED = "October 14, 2026";

export default function TermsPage() {
  return (
    <article className="fb-legal-doc">
      <p className="fb-kicker">Legal</p>
      <h1 className="fb-title">Terms of Use</h1>
      <p className="fb-copy">Last updated {UPDATED}</p>

      <p>
        These terms govern your use of Fitness Battle on the web and on iOS /
        Android. By creating an account or using the apps, you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        Fitness Battle lets you compete in weekly fitness battles, connect
        trackers, and view standings and related training tools. Features may
        change as the product evolves. Demo or stub tracker modes are labeled
        and are not live connections.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate account information and keep your credentials
        secure. You are responsible for activity under your account. The app is
        not directed at children under 13.
      </p>

      <h2>3. Fitness and health data</h2>
      <p>
        Connecting Strava, Garmin, WHOOP, Oura, Apple Health, Health Connect, or
        importing files is optional and under your control. You are responsible
        for complying with each provider’s terms. Fitness Battle is not a
        medical device and does not provide medical advice.
      </p>

      <h2>4. Competitions and conduct</h2>
      <p>
        Boards and 1v1s are for fair, recreational competition. Do not cheat,
        abuse APIs, harass others, or attempt to access another user’s account
        or data. We may suspend accounts that harm the service or other users.
      </p>

      <h2>5. Content and rankings</h2>
      <p>
        Public race rankings may show third-party results with attribution.
        Display names and scored effort may appear to other participants in
        battles you join.
      </p>

      <h2>6. Disclaimer</h2>
      <p>
        The service is provided “as is.” We do not warrant uninterrupted or
        error-free operation. To the fullest extent permitted by law, we are not
        liable for indirect or consequential damages arising from use of the
        apps.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:jerrry333x@gmail.com">jerrry333x@gmail.com</a>. Privacy
        details are in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <p className="fb-legal-foot">
        <Link href="/">Back to Fitness Battle</Link>
      </p>
    </article>
  );
}
