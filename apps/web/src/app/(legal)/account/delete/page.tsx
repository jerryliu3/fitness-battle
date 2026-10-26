import { AppHeading, AppParagraph } from "@/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountClient } from "./delete-account-client";

export const metadata: Metadata = {
  title: "Delete account · overtaek",
  description:
    "Permanently delete your Overtaek account and associated personal data from the web.",
  robots: { index: true, follow: true },
};

export default function DeleteAccountPage() {
  return (
    <article className="fb-legal-doc">
      <AppParagraph typographyRole="label" className="fb-kicker">
        Account
      </AppParagraph>
      <AppHeading level={1} role="display" className="fb-title">
        Delete your account
      </AppHeading>
      <DeleteAccountClient />
      <AppParagraph typographyRole="body" className="fb-legal-foot">
        <Link href="/support">Support</Link>
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
      </AppParagraph>
    </article>
  );
}
