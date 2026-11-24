import { redirect } from "next/navigation";
import { InviteClient } from "./invite-client";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { invite } = await searchParams;
  const code = (Array.isArray(invite) ? invite[0] : invite)?.trim();
  if (!code) redirect("/app/field");

  return <InviteClient code={code} />;
}