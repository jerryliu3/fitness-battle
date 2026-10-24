"use client";
import { AppText, PageHeader, Section, SectionStack, StatusBadge, Surface, ListRow, TextAction } from "@/ui/section";
import { SHELL_TYPOGRAPHY, type TypographyRole } from "@fitness-battle/shared";
export default function ComponentGallery() {
  return <main style={{ maxWidth: 880, margin: "auto", padding: 20, background: "#f8f9f6", color: "#142b3b" }}><SectionStack divided={false}>
    <PageHeader title="Everyday Club components" subtitle="Review at 320, 390 and 430 pixels, desktop and 200% zoom."/>
    <Section title="Typography">{(Object.keys(SHELL_TYPOGRAPHY) as TypographyRole[]).map(role => <div key={role}><AppText role={role}>{role} · Everyday progress</AppText></div>)}</Section>
    <Section title="A longer section title that needs room to wrap" subtitle="Supporting copy follows the same hierarchy." action={<TextAction href="#states" label="View all" accessibilityLabel="View all component states"/>}><Surface><ListRow title="Morning run" subtitle="Manual activity · Oct 24" trailing={<StatusBadge tone="success">Earned</StatusBadge>}/></Surface></Section>
    <Section title="States"><div id="states"><StatusBadge>Up next</StatusBadge> <StatusBadge tone="success">Earned with a longer status label</StatusBadge></div><AppText secondary>No activities yet.</AppText><p role="status">Activities could not load. Try again.</p></Section>
  </SectionStack></main>;
}
