import { useFocusStyles } from "../src/ui/focus";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SHELL_TYPOGRAPHY, type TypographyRole } from "@fitness-battle/shared";
import { AppText, PageHeader, Section, SectionStack, StatusBadge, Surface, ListRow, TextAction } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";
export default function ComponentGallery() {
  const f = useFocusStyles();

  const router = useRouter();
  return <View style={f.safe}><ScreenHeader title="Components" onBack={() => router.back()}/><ScrollView contentContainerStyle={f.content}><SectionStack>
    <PageHeader title="Everyday Club" subtitle="Review with large accessibility text and both system appearances."/>
    <Section title="Typography">{(Object.keys(SHELL_TYPOGRAPHY) as TypographyRole[]).map(role => <AppText key={role} role={role}>{role} · Everyday progress</AppText>)}</Section>
    <Section title="A longer section title that needs room to wrap" subtitle="Supporting copy follows the same hierarchy." action={<TextAction label="View all" accessibilityLabel="View all typography roles" onPress={() => router.replace("/components" as never)}/> }><Surface><ListRow title="Morning run" subtitle="Manual activity · Oct 24" trailing={<StatusBadge tone="success">Earned</StatusBadge>}/></Surface></Section>
    <Section title="States"><StatusBadge>Up next</StatusBadge><StatusBadge tone="success">Earned with a longer status label</StatusBadge><AppText secondary>No activities yet.</AppText><AppText accessibilityLiveRegion="polite">Activities could not load. Try again.</AppText></Section>
  </SectionStack></ScrollView></View>;
}
