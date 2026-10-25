import { AppHeading } from "@/ui/section";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · overtaek",
  description:
    "Terms governing your use of overtaek, including fitness battles, connected trackers, and community features.",
};

const UPDATED = "October 24, 2026";

export default function TermsOfServicePage() {
  return (
    <article className="fb-legal-doc">
      <p className="fb-kicker">Legal</p>
      <AppHeading level={1} role="display" className="fb-title">Terms of Service</AppHeading>
      <p className="fb-copy">Last updated {UPDATED}</p>

      <p>
        These Terms of Service (“Terms”) are a contract between you and the
        operator of overtaek (“we”, “us”, or “the app”). By creating an account,
        signing in, or using the web or mobile apps, you agree to these Terms
        and our{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not
        use the service.
      </p>

      <AppHeading level={2} role="heading">1. The service</AppHeading>
      <p>
        overtaek helps you join fitness battles, sync or upload workouts,
        compare effort with other participants, and use related features such as
        crews, standings, and progress views. We may add, change, or remove
        features over time. The service is provided on an “as available” basis
        during early development; occasional downtime, bugs, or incomplete
        features may occur.
      </p>

      <AppHeading level={2} role="heading">2. Eligibility</AppHeading>
      <p>
        You must be at least 13 years old to use overtaek. If you are under 18,
        you may use the app only with permission from a parent or legal guardian
        who accepts these Terms on your behalf. You represent that the
        information you provide is accurate and that you are legally able to
        enter this agreement.
      </p>

      <AppHeading level={2} role="heading">3. Your account</AppHeading>
      <p>
        You are responsible for your account credentials and for activity under
        your account. Keep your password confidential and notify us if you
        believe your account was compromised. We may suspend or terminate
        accounts that violate these Terms or that we reasonably believe pose a
        security or abuse risk.
      </p>

      <AppHeading level={2} role="heading">4. Battles, crews, and shared information</AppHeading>
      <p>
        When you join a battle or crew, other members can see information needed
        for competition—such as your display name, scores, standings, and
        contribution to group progress—as described in our Privacy Policy. You
        choose which battles and crews to join. Battle organizers and other
        participants are not our agents; we do not control their conduct outside
        the product.
      </p>

      <AppHeading level={2} role="heading">5. Connected fitness services</AppHeading>
      <p>
        Connecting a tracker (for example Strava, Garmin, WHOOP, or Oura) is
        optional. When you connect a provider, you authorize us to access data
        under the permissions you approve, subject to that provider’s terms and
        policies. You must comply with the provider’s rules and only connect
        accounts you own or are permitted to use. Disconnecting in the app stops
        future syncing as described in the Privacy Policy.
      </p>

      <AppHeading level={2} role="heading">6. Health and fitness disclaimer</AppHeading>
      <p>
        overtaek is for motivation and friendly competition. It is not medical
        advice, a medical device, or a substitute for professional healthcare,
        training supervision, or emergency services. Scores, readiness metrics,
        and standings are estimates for entertainment and self-tracking—not
        diagnoses or treatment recommendations. Consult a qualified professional
        before starting or changing an exercise program. Stop activity and seek
        medical help if you experience pain, dizziness, or other concerning
        symptoms.
      </p>

      <AppHeading level={2} role="heading">7. Acceptable use</AppHeading>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for any unlawful purpose or in violation of others’ rights</li>
        <li>Upload false workouts, manipulate scores, or otherwise cheat in battles</li>
        <li>Harass, threaten, or abuse other users or post hateful or illegal content</li>
        <li>Probe, scrape, or overload our systems without permission</li>
        <li>Reverse engineer or attempt to extract source code except where law allows</li>
        <li>Resell or commercially exploit the service without our written consent</li>
      </ul>
      <p>
        We may remove content, adjust standings, or restrict access when we
        reasonably believe a violation occurred.
      </p>

      <AppHeading level={2} role="heading">8. Your content</AppHeading>
      <p>
        You retain ownership of content you submit (such as display names and
        workouts you upload). You grant us a non-exclusive, worldwide license to
        use, store, display, and process that content solely to operate and
        improve the service—for example to score battles and show standings.
        You represent that you have the rights needed to grant this license.
      </p>

      <AppHeading level={2} role="heading">9. Our intellectual property</AppHeading>
      <p>
        The overtaek name, branding, software, and design are ours or our
        licensors’. These Terms do not grant you any right to our trademarks or
        except for the limited right to use the apps as intended.
      </p>

      <AppHeading level={2} role="heading">10. Third-party services</AppHeading>
      <p>
        The app relies on third-party hosts and providers (such as Vercel and
        Supabase) and links to or integrates with third-party fitness
        platforms. Those services are governed by their own terms. We are not
        responsible for third-party products, outages, or policy changes.
      </p>

      <AppHeading level={2} role="heading">11. Termination</AppHeading>
      <p>
        You may stop using overtaek at any time and may request account deletion
        as described in the Privacy Policy. We may suspend or terminate your
        access if you breach these Terms, if required by law, or if we
        discontinue the service. Sections that by nature should survive
        (including disclaimers, limitations of liability, and indemnity) survive
        termination.
      </p>

      <AppHeading level={2} role="heading">12. Disclaimers</AppHeading>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS”
        AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
        IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
        SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT SCORES OR SYNCED DATA
        WILL BE ACCURATE OR COMPLETE.
      </p>

      <AppHeading level={2} role="heading">13. Limitation of liability</AppHeading>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL NOT BE
        LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR
        USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE
        SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU
        PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B)
        ONE HUNDRED U.S. DOLLARS ($100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN
        LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS LIMITED TO THE FULLEST
        EXTENT PERMITTED BY LAW.
      </p>

      <AppHeading level={2} role="heading">14. Indemnification</AppHeading>
      <p>
        You will defend, indemnify, and hold us harmless from claims, damages,
        and expenses (including reasonable attorneys’ fees) arising from your use
        of the service, your content, your violation of these Terms, or your
        violation of any third-party rights.
      </p>

      <AppHeading level={2} role="heading">15. Disputes and governing law</AppHeading>
      <p>
        These Terms are governed by the laws of the State of New York, excluding
        its conflict-of-law rules, except where mandatory consumer protection
        laws in your country of residence apply. Except where prohibited, you
        and we agree that disputes will be resolved in the state or federal
        courts located in New York County, New York, and you consent to personal
        jurisdiction there. Nothing in this section limits either party’s right
        to seek injunctive relief for misuse of intellectual property or
        unauthorized access.
      </p>

      <AppHeading level={2} role="heading">16. Changes</AppHeading>
      <p>
        We may update these Terms as the product evolves. We will revise the
        “Last updated” date above and, when changes are material, provide
        additional notice in the app when practical. Continued use after changes
        take effect constitutes acceptance of the updated Terms.
      </p>

      <AppHeading level={2} role="heading">17. Contact</AppHeading>
      <p>
        Questions about these Terms:{" "}
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
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </article>
  );
}
