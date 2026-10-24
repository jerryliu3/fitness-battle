
import { AppParagraph, AppHeading } from "@/ui/section";
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
      <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Legal</AppParagraph>
      <AppHeading level={1} role="pageTitle" className="fb-title">Privacy Policy</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">Last updated {UPDATED}</AppParagraph>

      <AppParagraph typographyRole="body">
        overtaek (“we”, “us”, or “the app”) helps you run fitness battles
        with automatic tracking. This policy explains what we collect, why we
        use it, and the choices you have. It is written for ordinary use of the
        product, including when you connect a wearable or activity service.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">1. Who this applies to</AppHeading>
      <AppParagraph typographyRole="body">
        This policy covers the overtaek web and mobile apps and related APIs. If you
        use a third-party service through us (for example Garmin, Strava, WHOOP,
        or Oura), that provider’s own privacy policy also applies to data they
        hold.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">2. Information we collect</AppHeading>
      <AppHeading level={3} role="contentTitle">Account</AppHeading>
      <AppParagraph typographyRole="body">
        When you create an account we collect your email address, password (stored
        by our auth provider), and optional display name. We use this to sign you
        in and show you on boards.
      </AppParagraph>
      <AppHeading level={3} role="contentTitle">Fitness and health connections</AppHeading>
      <AppParagraph typographyRole="body">
        If you connect a tracker, we receive only the data needed to score
        battles and show readiness when that provider supports it. Depending on
        the provider and the scopes you approve, this may include:
      </AppParagraph>
      <ul>
        <li>Workouts and activity summaries (type, time, distance, duration, heart rate when provided)</li>
        <li>Recovery or readiness scores and related sleep metrics when supported by your connected service</li>
        <li>Basic profile fields the provider exposes under the scopes you grant (such as name or email)</li>
        <li>OAuth access and refresh tokens so we can sync on your behalf until you disconnect</li>
      </ul>
      <AppParagraph typographyRole="body">
        Device sources such as Apple Health or Health Connect only send workouts
        you choose to upload from the mobile app. We do not scrape your phone
        health store from the web.
      </AppParagraph>
      <AppHeading level={3} role="contentTitle">Battle and product data</AppHeading>
      <AppParagraph typographyRole="body">
        We store battle membership, preferences, period standings, imported or
        synced activity samples used for scoring, and similar product state so
        the board and history work across devices.
      </AppParagraph>
      <AppHeading level={3} role="contentTitle">Technical data</AppHeading>
      <AppParagraph typographyRole="body">
        Like most web apps, our hosts may process standard request logs (IP
        address, user agent, timestamps) for security and reliability.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">3. How we use information</AppHeading>
      <ul>
        <li>Authenticate you and keep your session secure</li>
        <li>Sync activities and readiness to compute battle scores and standings</li>
        <li>Show you progress, history, and connection status in the app</li>
        <li>Operate, protect, and improve the service</li>
        <li>Respond to support requests you send us</li>
      </ul>
      <AppParagraph typographyRole="body">
        We do not sell your personal information. We do not use fitness or health
        data for advertising.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">4. How we share information</AppHeading>
      <AppParagraph typographyRole="body">We share data only as needed to run the product:</AppParagraph>
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

      <AppParagraph typographyRole="body">
        Apart from the product features, infrastructure providers, and legal
        disclosures described above, we do not share fitness or health data
        with third parties for their own use. We do not send this data to
        third-party analytics services or other integration partners.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">5. Connected fitness services</AppHeading>
      <AppParagraph typographyRole="body">
        Connecting a fitness service is optional. We receive the data available
        under the permissions you approve, and use it to populate workout
        history, calculate effort scores and weekly standings, and show personal
        progress. Where supported and authorized, we also use sleep, recovery,
        or readiness data to display those metrics in the app. These practices
        apply to all connected services, including Garmin.
      </AppParagraph>
      <AppParagraph typographyRole="body">
        The authorization screen identifies the permissions requested by each
        service. The provider’s own privacy policy governs the information it
        holds. You can withdraw consent for future syncing by disconnecting the
        service in the app’s tracker settings or revoking overtaek’s access in
        the provider’s account settings. Disconnecting through the app removes
        stored authorization tokens and stops future syncing. It does not
        automatically delete previously imported activities; you can request
        deletion as described below.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">6. AI and machine learning</AppHeading>
      <AppParagraph typographyRole="body">
        We do not send fitness or health data, or information derived from it,
        to AI or machine learning systems. We do not use this data to train,
        evaluate, or improve AI models. Any future permitted AI processing would
        require an updated disclosure, your explicit opt-in consent, and an easy
        way to withdraw that consent before processing begins. Provider
        restrictions on AI use continue to apply regardless of consent.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">7. Storage and retention</AppHeading>
      <AppParagraph typographyRole="body">
        Account and battle data live in our application database. Fitness OAuth
        tokens are stored server-side in a private token store, not in the
        browser. We keep data while your account is active and as needed to
        operate battles you belong to. You may ask us to delete your account
        data; we will remove or anonymize personal data we control except where
        we must retain a limited record for security, legal, or abuse-prevention
        reasons.
      </AppParagraph>
      <AppParagraph typographyRole="body">
        In demo mode, some session state may stay on your device only and is not
        a live cloud connection.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">8. Security</AppHeading>
      <AppParagraph typographyRole="body">
        We use industry-standard protections appropriate for an early consumer
        app: encrypted transport (HTTPS), access controls, and server-side
        storage of provider secrets and tokens. No method of transmission or
        storage is perfectly secure.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">9. Your choices and data rights</AppHeading>
      <ul>
        <li>View synced activity history and progress in the app</li>
        <li>Update your display name and preferences in the app</li>
        <li>Disconnect trackers or revoke access in the provider’s settings</li>
        <li>Request access, correction, export, or deletion of your data</li>
      </ul>
      <AppParagraph typographyRole="body">
        To request a copy or export of your data, correct inaccurate stored
        information, or delete imported activities and associated personal
        progress records, email{" "}
        <a href="mailto:3jerryliu@gmail.com">3jerryliu@gmail.com</a>
        {" "}from your account email address. We verify account ownership before
        fulfilling requests. You can also request account deletion through the
        app or by email, subject to the limited retention exceptions above.
        These choices apply to all connected fitness data as well as other
        personal information we hold.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">10. Children</AppHeading>
      <AppParagraph typographyRole="body">
        overtaek is not directed at children under 13, and we do not
        knowingly collect personal information from children under 13. Public
        race rankings separately exclude under-18 finishers where our import
        rules apply.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">11. International users</AppHeading>
      <AppParagraph typographyRole="body">
        We may process data in the United States or other countries where our
        providers operate. If you use the app from elsewhere, you understand
        your information may be transferred to those locations.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">12. Changes</AppHeading>
      <AppParagraph typographyRole="body">
        We may update this policy as the product changes. We will revise the
        “Last updated” date above and, when changes are material, provide
        additional notice in the app when practical.
      </AppParagraph>

      <AppHeading level={2} role="sectionTitle">13. Contact</AppHeading>
      <AppParagraph typographyRole="body">
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
      </AppParagraph>

      <AppParagraph typographyRole="body" className="fb-legal-foot">
        <Link href="/">Back to overtaek</Link>
      </AppParagraph>
    </article>
  );
}
