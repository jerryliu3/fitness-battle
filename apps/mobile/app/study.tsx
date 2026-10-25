import { Link } from "expo-router";
import { Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  Copy,
  Heading,
  palette,
} from "../src/prototypes/tab-studies/kit";

/** Review-only entry point; no production tab or data dependency. */
export default function NativeStudies() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 20,
          maxWidth: 520,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Heading eyebrow="Overtaek / Native UX studies">
          More ways to move.
        </Heading>
        <Copy>
          31 original compositions. Open a tab, compare its concepts, and
          explore the nested pages. All data and account edits are fictional and
          local.
        </Copy>
        {[
          {
            href: "/study-compete",
            name: "01 / Compete",
            count: "9 concepts",
            note: "Leaderboards, rivals, events and past results.",
          },
          {
            href: "/study-progress",
            name: "02 / Progress",
            count: "9 concepts",
            note: "Historical charts, calendars, trends and records.",
          },
          {
            href: "/study-crew",
            name: "03 / Crew",
            count: "9 concepts",
            note: "Shared visuals, member depth and planned sessions.",
          },
          {
            href: "/study-profile",
            name: "04 / Profile",
            count: "4 concepts",
            note: "Identity, public highlights and owner settings.",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href as "/study-compete"} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${item.name}`}
            >
              <Card>
                <Copy size={24} bold>
                  {item.name} →
                </Copy>
                <Copy size={12} bold color={palette.teal}>
                  {item.count}
                </Copy>
                <Copy muted>{item.note}</Copy>
              </Card>
            </Pressable>
          </Link>
        ))}
        <Copy size={12} muted>
          React Native + native SVG. The bottom tabs inside a concept are
          orientation chrome. Use Back or the study route to switch studies.
          Production screens and backend behavior are unchanged.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
