import { AppHeading, AppParagraph } from "@/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountSection } from "./delete-account-section";

export const metadata: Metadata = {
  title: "Support · overtaek",
  description:
    "Contact Overtaek support, get help with your account, and request account or data deletion.",
};

const SUPPORT_EMAIL = "support@overtaek.xyz";

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}`;

  return (
    <article className="fb-legal-doc">
      <AppParagraph typographyRole="label" className="fb-kicker">
        Help
      </AppParagraph>
      <AppHeading level={1} role="display" className="fb-title">
        Support
      </AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        Questions about your account, connected trackers, privacy, or deleting
        your data? We are here to help.
      </AppParagraph>

      <AppHeading level={2} role="heading">Contact</AppHeading>
      <AppParagraph typographyRole="body">
        Email{" "}
        <a href={mailto}>{SUPPORT_EMAIL}</a> from the address tied to your
        Overtaek account when the request involves your data. We usually reply
        within a few business days.
      </AppParagraph>

      <AppHeading level={2} role="heading" id="delete-account">
        Account & data deletion
      </AppHeading>
      <AppParagraph typographyRole="body">
        You can permanently delete your Overtaek account and the personal data we
        control without reinstalling the mobile app.
      </AppParagraph>
      <ul>
        <li>
          <strong>In the app:</strong> Athlete → Account → Delete account (web
          and mobile).
        </li>
        <li>
          <strong>On the web:</strong> use the form below while signed in.
        </li>
        <li>
          <strong>By email:</strong> send a deletion request to{" "}
          <a href={mailto}>{SUPPORT_EMAIL}</a> from your account email.
        </li>
      </ul>
      <AppParagraph typographyRole="body">
        Deletion removes your auth record and associated database rows we
        control. Some limited records may be retained where required for
        security, legal, or abuse-prevention reasons, as described in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </AppParagraph>
      <DeleteAccountSection />

      <AppHeading level={2} role="heading">Common topics</AppHeading>
      <ul>
        <li>
          <strong>Trackers:</strong> connect or disconnect services under Athlete
          → Data sync. OAuth providers (Strava, Garmin, WHOOP, Oura) each have
          their own privacy policies for data they hold.
        </li>
        <li>
          <strong>Apple Health & Health Connect:</strong> workouts upload only
          when you sync from the mobile app; we do not read your on-device health
          store from the website.
        </li>
        <li>
          <strong>Report a problem:</strong> use Report an issue under Athlete →
          Account in the app, or email support with screenshots and steps to
          reproduce.
        </li>
      </ul>

      <AppHeading level={2} role="heading">Policies</AppHeading>
      <AppParagraph typographyRole="body">
        <Link href="/privacy">Privacy Policy</Link>
        {" · "}
        <Link href="/terms">Terms of Service</Link>
      </AppParagraph>

      <AppParagraph typographyRole="body" className="fb-legal-foot">
        <Link href="/">Back to home</Link>
        {" · "}
        <Link href="/app/today">Open the app</Link>
      </AppParagraph>
    </article>
  );
}
