import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · overtaek",
  description:
    "How overtaek collects, uses, and shares account and fitness data, and the choices you have when using connected fitness services.",
};

const UPDATED = "October 23, 2026";

export default function PrivacyPolicyPage() {
  return (
    <article className="fb-legal-doc">
      <p className="fb-kicker">Legal</p>
      <h1 className="fb-title">Privacy Policy</h1>
      <p className="fb-copy">Last updated {UPDATED}</p>

      <p>
        overtaek (“we”, “us”, or “the app”) helps you run fitness battles
        with automatic tracking. This policy explains what we collect, why we
        use it, and the choices you have. It is written for ordinary use of the
        product, including when you connect a wearable or activity service.
      </p>

      <h2>1. Who this applies to</h2>
      <p>
        This policy covers the overtaek web and mobile apps and related APIs. If you
        use a third-party service through us (for example Garmin, Strava, WHOOP,
        or Oura), that provider’s own privacy policy also applies to data they
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
        <li>Recovery or readiness scores and related sleep metrics when supported by your connected service</li>
        <li>Basic profile fields the provider exposes under the scopes you grant (such as name or email)</li>
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
        We do not sell your personal information. We do not use fitness or health
        data for advertising.
      </p>

      <h2>4. How we share information</h2>
      <p>We share data only as needed to run the product:</p>
      <ul>
        <li>
          <strong>Other participants.</strong> Your display name, scored effort,
          and standings appear in competitions you join. Members of crews you
          join can see your contribution to shared progress. These totals may
          be derived from connected activity data and are used for in-app
          competition and group progress. Authorization tokens and raw heart
          rate data are not shown to other participants.
        </li>
        <li>
          <strong>Service providers.</strong> Vercel hosts our web application
          and processes backend API requests, including activity sync. Supabase
          provides database storage and account authentication. These providers
          process account and connected fitness data on our instructions to
          operate the service.
        </li>
        <li>
          <strong>Fitness providers.</strong> When you connect a tracker, you
          authorize that provider to share data with us. Authorization and sync
          requests go to that provider’s APIs under its terms. We do not forward
          imported activity data to other connected fitness providers.
        </li>
        <li>
          <strong>Legal.</strong> We may disclose information if required by law
          or to protect the app, users, or others from serious harm.
        </li>
      </ul>

      <p>
        Apart from the product features, infrastructure providers, and legal
        disclosures described above, we do not share fitness or health data
        with third parties for their own use. We do not send this data to
        third-party analytics services or other integration partners.
      </p>

      <h2>5. Connected fitness services</h2>
      <p>
        Connecting a fitness service is optional. We receive the data available
        under the permissions you approve, and use it to populate workout
        history, calculate effort scores and weekly standings, and show personal
        progress. Where supported and authorized, we also use sleep, recovery,
        or readiness data to display those metrics in the app. These practices
        apply to all connected services, including Garmin.
      </p>
      <p>
        The authorization screen identifies the permissions requested by each
        service. The provider’s own privacy policy governs the information it
        holds. You can withdraw consent for future syncing by disconnecting the
        service in the app’s tracker settings or revoking overtaek’s access in
        the provider’s account settings. Disconnecting through the app removes
        stored authorization tokens and stops future syncing. It does not
        automatically delete previously imported activities; you can request
        deletion as described below.
      </p>

      <h2>6. AI and machine learning</h2>
      <p>
        We do not send fitness or health data, or information derived from it,
        to AI or machine learning systems. We do not use this data to train,
        evaluate, or improve AI models. Any future permitted AI processing would
        require an updated disclosure, your explicit opt-in consent, and an easy
        way to withdraw that consent before processing begins. Provider
        restrictions on AI use continue to apply regardless of consent.
      </p>

      <h2>7. Storage and retention</h2>
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

      <h2>8. Security</h2>
      <p>
        We use industry-standard protections appropriate for an early consumer
        app: encrypted transport (HTTPS), access controls, and server-side
        storage of provider secrets and tokens. No method of transmission or
        storage is perfectly secure.
      </p>

      <h2>9. Your choices and data rights</h2>
      <ul>
        <li>View synced activity history and progress in the app</li>
        <li>Update your display name and preferences in the app</li>
        <li>Disconnect trackers or revoke access in the provider’s settings</li>
        <li>Request access, correction, export, or deletion of your data</li>
      </ul>
      <p>
        To request a copy or export of your data, correct inaccurate stored
        information, or delete imported activities and associated personal
        progress records, email{" "}
        <a href="mailto:3jerryliu@gmail.com">3jerryliu@gmail.com</a>
        {" "}from your account email address. We verify account ownership before
        fulfilling requests. You can also request account deletion through the
        app or by email, subject to the limited retention exceptions above.
        These choices apply to all connected fitness data as well as other
        personal information we hold.
      </p>

      <h2>10. Children</h2>
      <p>
        overtaek is not directed at children under 13, and we do not
        knowingly collect personal information from children under 13. Public
        race rankings separately exclude under-18 finishers where our import
        rules apply.
      </p>

      <h2>11. International users</h2>
      <p>
        We may process data in the United States or other countries where our
        providers operate. If you use the app from elsewhere, you understand
        your information may be transferred to those locations.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update this policy as the product changes. We will revise the
        “Last updated” date above and, when changes are material, provide
        additional notice in the app when practical.
      </p>

      <h2>13. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:3jerryliu@gmail.com">3jerryliu@gmail.com</a>
        . You can also reach us through the{" "}
        <a
          href="https://github.com/jerryliu3/fitness-battle"
          target="_blank"
          rel="noopener noreferrer"
        >
          overtaek GitHub repository
        </a>
        .
      </p>

      <p className="fb-legal-foot">
        <Link href="/">Back to overtaek</Link>
      </p>
    </article>
  );
}
