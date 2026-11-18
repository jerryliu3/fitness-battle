import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./invite.module.css";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { invite } = await searchParams;
  const code = (Array.isArray(invite) ? invite[0] : invite)?.trim();
  if (!code) redirect("/app/field");

  const query = new URLSearchParams({ invite: code });
  const joinPath = `/app/field?${query}`;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Join your crew</h1>
        <p>Open this invite in Overtaek if you have the app.</p>
        <a className={styles.primary} href={`overtaek:///invite?${query}`}>Open in app</a>
        <Link href={`/app/welcome?next=${encodeURIComponent(joinPath)}`}>Continue on web</Link>
      </section>
    </main>
  );
}
