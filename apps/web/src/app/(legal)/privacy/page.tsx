import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Fitness Battle",
  description:
    "How Fitness Battle collects, uses, and shares account and fitness data, including WHOOP and other trackers.",
};

const UPDATED = "October 13, 2026";

export default function PrivacyPolicyPage() {
  return (
    <article className="fb-legal-doc">
      <p className="fb-kicker">Legal</p>
      <h1 className="fb-title">Privacy Policy</h1>
      <p className="fb-copy">Last updated {UPDATED}</p>

      <p>
        Fitness Battle (“we”, “us”, or “the app”) helps you run fitness battles
        with automatic tracking. This policy explains what we collect, why we
        use it, and the choices you have. It is written for ordinary use of the
        product, including when you connect a wearable or activity service such
        as WHOOP.
      </p>

      <h2>1. Who this applies to</h2>
      <p>
        This policy covers the Fitness Battle web app and related APIs. If you
        use a third-party service through us (for example WHOOP, Strava, Oura,
        or Garmin), that provider’s own privacy policy also applies to data they
        hold.
      </p>

      <h2>2. Information we collect</h2>
      <h3>Account</h3>
      <p>
        When you create an account we collect your email address, password (stored
        by our auth provider), and optional display name. We use this to sign you
        in and show you on boards.
      </p>
      <h3>Fitness and health connections</h3>
      <p>
        If you connect a tracker, we receive only the data needed to score
        battles and show readiness when that provider supports it. Depending on
        the provider and the scopes you approve, this may include:
      </p>
      <ul>
        <li>Workouts and activity summaries (type, time, distance, duration, heart rate when provided)</li>
        <li>Recovery or readiness scores and related sleep metrics when you connect WHOOP or Oura</li>
        <li>Basic profile fields the provider exposes under the scopes you grant (for example name or email on WHOOP)</li>
        <li>OAuth access and refresh tokens so we can sync on your behalf until you disconnect</li>
      </ul>
      <p>
        Device sources such as Apple Health or Health Connect only send workouts
        you choose to upload from the mobile app. We do not scrape your phone
        health store from the web.
      </p>
      <h3>Battle and product data</h3>
      <p>
        We store battle membership, preferences, period standings, imported or
        synced activity samples used for scoring, and similar product state so
        the board and history work across devices.
      </p>
      <h3>Technical data</h3>
      <p>
        Like most web apps, our hosts may process standard request logs (IP
        address, user agent, timestamps) for security and reliability.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>Authenticate you and keep your session secure</li>
        <li>Sync activities and readiness to compute battle scores and standings</li>
        <li>Show you progress, history, and connection status in the app</li>
        <li>Operate, protect, and improve the service</li>
        <li>Respond to support requests you send us</li>
      </ul>
      <p>
        We do not sell your personal information. We do not use WHOOP or other
        fitness data for advertising.
      </p>

      <h2>4. How we share information</h2>
      <p>We share data only as needed to run the product:</p>
      <ul>
        <li>
          <strong>Other participants.</strong> Display name and scored effort
          appear on battles and standings you join.
        </li>
        <li>
          <strong>Service providers.</strong> Infrastructure such as hosting
          (for example Vercel) and database/auth (Supabase) process data on our
          instructions.
        </li>
        <li>
          <strong>Fitness providers.</strong> When you connect WHOOP or another
          tracker, you authorize that provider to share data with us. Tokens and
          sync traffic go to their APIs under their terms.
        </li>
        <li>
          <strong>Legal.</strong> We may disclose information if required by law
          or to protect the app, users, or others from serious harm.
        </li>
      </ul>

      <h2>5. WHOOP</h2>
      <p>
        When you connect WHOOP, Fitness Battle requests the scopes shown in the
        WHOOP authorization screen (currently offline access plus recovery,
        sleep, workout, and profile read access). We use that data to sync
        workouts and readiness into your battles. You can disconnect WHOOP in
        the Athlete section of the app, and you can revoke access at any time in
        your WHOOP account settings. After disconnect or revoke, we stop pulling
        new WHOOP data and clear stored WHOOP tokens.
      </p>
      <p>
        WHOOP’s handling of your account is governed by{" "}
        <a
          href="https://www.whoop.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          WHOOP’s privacy policy
        </a>
        .
      </p>

      <h2>6. Storage and retention</h2>
      <p>
        Account and battle data live in our application database. Fitness OAuth
        tokens are stored server-side in a private token store, not in the
        browser. We keep data while your account is active and as needed to
        operate battles you belong to. You may ask us to delete your account
        data; we will remove or anonymize personal data we control except where
        we must retain a limited record for security, legal, or abuse-prevention
        reasons.
      </p>
      <p>
        In demo mode, some session state may stay on your device only and is not
        a live cloud connection.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard protections appropriate for an early consumer
        app: encrypted transport (HTTPS), access controls, and server-side
        storage of provider secrets and tokens. No method of transmission or
        storage is perfectly secure.
      </p>

      <h2>8. Your choices</h2>
      <ul>
        <li>Update display name and preferences in the app</li>
        <li>Connect or disconnect trackers from Athlete / onboarding</li>
        <li>Revoke provider access in that provider’s own settings</li>
        <li>Request access, correction, or deletion by contacting us</li>
      </ul>

      <h2>9. Children</h2>
      <p>
        Fitness Battle is not directed at children under 13, and we do not
        knowingly collect personal information from children under 13. Public
        race rankings separately exclude under-18 finishers where our import
        rules apply.
      </p>

      <h2>10. International users</h2>
      <p>
        We may process data in the United States or other countries where our
        providers operate. If you use the app from elsewhere, you understand
        your information may be transferred to those locations.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy as the product changes. We will revise the
        “Last updated” date above and, when changes are material, provide
        additional notice in the app when practical.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:3jerryliu@gmail.com">3jerryliu@gmail.com</a>
        . You can also reach us through the{" "}
        <a
          href="https://github.com/jerryliu3/fitness-battle"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fitness Battle GitHub repository
        </a>
        .
      </p>

      <p className="fb-legal-foot">
        <Link href="/">Back to Fitness Battle</Link>
      </p>
    </article>
  );
}
