import { useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { effortRankBadge, initialsFromName } from "@fitness-battle/shared";
import { FocusSegments } from "../../ui/focus";
import { textStyle } from "../../ui/section";
import { SettingsRow } from "../../ui/settings-row";
import { IntegrationIcon } from "../../ui/integration-icon";
import {
  T,
  c,
  row,
  stack,
  Tap,
  Action,
  Pill,
  Metric,
  IconTap,
  SectionHeader,
  Surface,
  Rule,
  Study,
  Flow,
  useStudyNav,
  UserAvatar,
  AppIcon,
  Plot,
  Spark,
  type Page,
} from "./foundation";
import {
  profileRecords,
  profileStats,
  startingIdentity,
  type ProfileIdentity,
} from "./profile-data";
import { trainingRows, sessionName, shortDate } from "./training-data";
import { ProgressDetail } from "./progress";
const concepts = ["Club passport", "The field pass"] as const;
type Visibility = { city: boolean; records: boolean };
export default function ProfileRefinement() {
  return (
    <Study tab="profile" concepts={concepts}>
      {(i) => <Profile key={i} variant={i} />}
    </Study>
  );
}
export function Profile({ variant }: { variant: number }) {
  const [identity, setIdentity] = useState(startingIdentity),
    [pins, setPins] = useState(["5k", "10k", "longest"]),
    [visibility, setVisibility] = useState<Visibility>({
      city: true,
      records: true,
    }),
    [metric, setMetric] = useState(false);
  const params = useLocalSearchParams<{ public?: string }>();
  const router = useRouter();
  const publicView = params.public === "1";
  const card = (publicMode: boolean) => (
    <Passport
      variant={variant}
      identity={identity}
      pins={pins}
      visibility={visibility}
      metric={metric}
      publicMode={publicMode}
    />
  );
  return (
    <Flow
      render={(page) => (
        <ProfileDetail
          page={page}
          identity={identity}
          saveIdentity={setIdentity}
          pins={pins}
          savePins={setPins}
          visibility={visibility}
          setVisibility={setVisibility}
          metric={metric}
          setMetric={setMetric}
          card={card}
        />
      )}
    >
      <ProfileRoot
        variant={variant}
        publicView={publicView}
        setPublic={(v) => router.setParams({ public: v ? "1" : undefined })}
        card={card}
        metric={metric}
      />
    </Flow>
  );
}
function ProfileRoot({
  variant,
  publicView,
  setPublic,
  card,
  metric,
}: {
  variant: number;
  publicView: boolean;
  setPublic: (v: boolean) => void;
  card: (v: boolean) => React.ReactNode;
  metric: boolean;
}) {
  const nav = useStudyNav();
  const router = useRouter();
  return (
    <>
      <View style={row}>
        <IconTap
          icon="back"
          label={publicView ? "Return to your profile" : "Back to Compete"}
          onPress={() =>
            publicView
              ? setPublic(false)
              : router.push("/refine-compete" as "/today")
          }
        />
        <T
          role="heading"
          accessibilityRole="header"
          style={{ flex: 1, textAlign: "center" }}
        >
          {publicView ? "Public profile" : "Athlete"}
        </T>
        <IconTap
          icon={publicView ? "external" : "preferences"}
          label={publicView ? "Preview profile sharing" : "Profile settings"}
          onPress={() =>
            nav.push({
              key: publicView ? "share" : "settings",
              title: publicView ? "Share profile" : "Settings",
            })
          }
        />
      </View>
      {card(publicView)}
      {!publicView && (
        <View style={row}>
          <View style={{ flex: 1 }}>
            <Action
              label="Edit profile"
              secondary
              onPress={() => nav.push({ key: "edit", title: "Edit profile" })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              label="Public preview"
              secondary
              onPress={() => setPublic(true)}
            />
          </View>
        </View>
      )}
      <View style={stack}>
        <SectionHeader
          title="Since the first mile"
          subtitle="Counted training · 2026"
        />
        <View style={{ ...row, paddingVertical: 12 }}>
          <Metric
            value={`${(profileStats.runningMiles * (metric ? 1.609344 : 1)).toFixed(0)}`}
            label={metric ? "Running km" : "Running mi"}
          />
          <Metric value={String(profileStats.sessions)} label="Sessions" />
          <Metric
            value={String(profileStats.activeWeeks)}
            label="Active weeks"
          />
        </View>
      </View>
      {variant === 2 && (
        <View style={{ gap: 16 }}>
          <SectionHeader
            title="The marks you leave"
            subtitle="A personal history, one milestone at a time"
          />
          {[
            {
              id: "5k",
              date: "Oct 11",
              title: "A little faster",
              note: "5K · 23:42 · 18 seconds off your best",
            },
            {
              id: "longest",
              date: "Oct 22",
              title: "A little further",
              note: "Your longest run · 62 minutes",
            },
            {
              id: "streak",
              date: "Oct 25",
              title: "Still showing up",
              note: "Four active weeks, back to back",
            },
          ].map((m, i) => (
            <Tap
              key={m.id}
              onPress={() =>
                nav.push({ key: "profile-record", title: m.title, id: m.id })
              }
              style={{ ...row, alignItems: "stretch", gap: 16 }}
            >
              <View style={{ width: 12, alignItems: "center", paddingTop: 6 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: i === 2 ? c.tennis : c.secondary,
                  }}
                />
                {i < 2 && (
                  <View
                    style={{
                      width: 1,
                      flex: 1,
                      minHeight: 40,
                      backgroundColor: c.line,
                      marginTop: 6,
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1, gap: 4, paddingBottom: 16 }}>
                <T role="caption" secondary>
                  {m.date}
                </T>
                <T role="heading">{m.title}</T>
                <T role="caption" secondary>
                  {m.note}
                </T>
              </View>
              <AppIcon name="chevron" size={16} />
            </Tap>
          ))}
        </View>
      )}
      <Rule />
      <SectionHeader
        title="A few proud moments"
        subtitle="Milestones earned by showing up"
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          {
            title: "Four weeks strong",
            note: "4 active weeks in a row",
            key: "streak",
          },
          { title: "A new best", note: "23:42 · Your fastest 5K", key: "5k" },
        ].map((a, i) => (
          <Tap
            key={a.key}
            onPress={() =>
              nav.push({ key: "profile-record", title: a.title, id: a.key })
            }
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              padding: 16,
              gap: 8,
              backgroundColor: c.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Medallion index={i} />
            <T role="label" style={{ textAlign: "center" }}>
              {a.title}
            </T>
            <T role="caption" secondary style={{ textAlign: "center" }}>
              {a.note}
            </T>
          </Tap>
        ))}
      </View>
      {!publicView && (
        <>
          <Rule />
          <SectionHeader title="Your account" />
          {[
            {
              title: "Data Sync",
              detail: "Trackers, imports and activity sources",
              key: "sync",
            },
            {
              title: "Preferences",
              detail: "Units and your sport",
              key: "preferences",
            },
            {
              title: "Notifications",
              detail: "Your notification preferences",
              key: "notifications",
            },
            {
              title: "Public profile",
              detail: "Choose what other people see",
              key: "visibility",
            },
            {
              title: "How scoring works",
              detail: "Open, GPS and weekly effort",
              key: "scoring",
            },
            {
              title: "Account",
              detail: "Sign-in, support and account controls",
              key: "account",
            },
          ].map((s) => (
            <SettingsRow
              key={s.key}
              title={s.title}
              detail={s.detail}
              onPress={() => nav.push({ key: s.key, title: s.title })}
            />
          ))}
        </>
      )}
    </>
  );
}
export function Passport({
  variant,
  identity,
  pins,
  visibility,
  metric,
  publicMode,
}: {
  variant: number;
  identity: ProfileIdentity;
  pins: string[];
  visibility: Visibility;
  metric: boolean;
  publicMode: boolean;
}) {
  const nav = useStudyNav();
  const dark = variant !== 0;
  const ink = dark ? c.card : c.ink;
  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: variant === 2 ? c.fieldDeep : dark ? c.ink : c.card,
        borderWidth: 1,
        borderColor: c.line,
        overflow: "hidden",
      }}
    >
      {variant === 2 && (
        <View style={{ height: 6, flexDirection: "row" }}>
          {[c.tennis, "#d9e4da", c.secondary, c.tennis].map((color, i) => (
            <View
              key={i}
              style={{ flex: i === 1 ? 3 : 1, backgroundColor: color }}
            />
          ))}
        </View>
      )}
      <View style={{ padding: 22, gap: 18 }}>
        <View style={{ ...row, justifyContent: "space-between" }}>
          <T role="caption" style={{ color: dark ? "#c9d6e3" : c.muted }}>
            {variant === 2
              ? "OVERTAEK / CLUB EDITION 01"
              : "Overtaek / Athlete"}
          </T>
          <T role="caption" style={{ color: dark ? "#c9d6e3" : c.muted }}>
            Since Jan 2026
          </T>
        </View>
        {dark ? (
          <View style={{ ...row, gap: 16 }}>
            <UserAvatar
              name={identity.name}
              size={68}
              highlight
              fallback={<T role="heading">{initialsFromName(identity.name)}</T>}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <T role="display" style={{ color: ink }}>
                {identity.name}
              </T>
              {(!publicMode || visibility.city) && identity.city && (
                <T role="caption" style={{ color: "#c9d6e3" }}>
                  {identity.city}
                </T>
              )}
              <T role="caption" style={{ color: c.tennis }}>
                1,168 · {effortRankBadge(1168).name}
              </T>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: "100%",
                height: 136,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Horizon />
              <UserAvatar
                name={identity.name}
                size={88}
                fallback={
                  <T role="display">{initialsFromName(identity.name)}</T>
                }
              />
            </View>
            <T role="display" style={{ textAlign: "center" }}>
              {identity.name}
            </T>
            {(!publicMode || visibility.city) && identity.city && (
              <T role="body" secondary>
                {identity.city}
              </T>
            )}
            <View style={{ alignItems: "center" }}>
              <Pill>1,168 effort · {effortRankBadge(1168).name}</Pill>
            </View>
          </View>
        )}
        {identity.bio && (
          <T
            role="body"
            style={{
              textAlign: dark ? "left" : "center",
              color: dark ? "#c9d6e3" : c.muted,
            }}
          >
            {identity.bio}
          </T>
        )}
        {(!publicMode || visibility.records) && (
          <View
            style={{
              ...row,
              alignItems: "stretch",
              gap: 0,
              paddingTop: 18,
              borderTopWidth: 1,
              borderColor: dark ? "#ffffff26" : c.line,
            }}
          >
            {pins.map((id, i) => {
              const record = profileRecords.find((r) => r.id === id)!;
              return (
                <Tap
                  key={id}
                  label={`View ${record.label}, ${record.id === "longest" && metric ? "11.1 km" : record.value}`}
                  onPress={() =>
                    nav.push({ key: "profile-record", title: record.label, id })
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingHorizontal: 4,
                    gap: 8,
                    alignItems: "center",
                    borderLeftWidth: i ? 1 : 0,
                    borderColor: dark ? "#ffffff26" : c.line,
                  }}
                >
                  {dark ? (
                    <Medallion index={i} small />
                  ) : (
                    <View style={{ width: "90%", height: 36 }}>
                      <Spark
                        values={record.values.map((v) =>
                          id === "longest" || id === "streak"
                            ? v
                            : 30 + i * 30 - v,
                        )}
                        color={i === 1 ? "#a78022" : c.secondary}
                      />
                    </View>
                  )}
                  <T role="heading" style={{ color: ink, textAlign: "center" }}>
                    {record.id === "longest" && metric
                      ? "11.1 km"
                      : record.value}
                  </T>
                  <T
                    role="caption"
                    style={{
                      color: dark ? "#c9d6e3" : c.muted,
                      textAlign: "center",
                    }}
                  >
                    {record.label}
                  </T>
                </Tap>
              );
            })}
            {pins.length === 0 && (
              <T role="caption" style={{ color: dark ? "#c9d6e3" : c.muted }}>
                Your selected records will appear here.
              </T>
            )}
          </View>
        )}
        {variant === 2 && (
          <View
            style={{
              borderTopWidth: 1,
              borderColor: "#ffffff26",
              paddingTop: 14,
              gap: 5,
            }}
          >
            <T role="label" style={{ color: c.tennis }}>
              Four weeks. A hundred small decisions.
            </T>
            <T role="caption" style={{ color: "#c9d6e3" }}>
              Your records tell the story. Your consistency makes it yours.
            </T>
          </View>
        )}
        {!publicMode && (
          <Tap
            label="Choose the three records on your passport"
            onPress={() =>
              nav.push({ key: "pins", title: "Your card highlights" })
            }
            style={{ alignSelf: "center" }}
          >
            <T role="caption" style={{ color: dark ? "#c9d6e3" : c.muted }}>
              Edit card highlights
            </T>
          </Tap>
        )}
      </View>
    </View>
  );
}
function Horizon() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={136}
      viewBox="0 0 300 136"
      style={{ position: "absolute", inset: 0 }}
    >
      <Circle cx={150} cy={72} r={63} fill={c.soft} />
      <Circle
        cx={150}
        cy={72}
        r={57}
        stroke="#bfccc5"
        fill="none"
        strokeDasharray="1 6"
      />
      {[0, 1, 2, 3].map((i) => (
        <Path
          key={i}
          d={`M0 ${100 + i * 9} Q75 ${65 + i * 10} 150 ${105 + i * 7} T300 ${85 + i * 10}`}
          fill="none"
          stroke={i === 0 ? c.tennis : "#c7d5cf"}
          strokeWidth={i === 0 ? 2 : 1}
        />
      ))}
    </Svg>
  );
}
function Medallion({
  index,
  small = false,
}: {
  index: number;
  small?: boolean;
}) {
  const size = small ? 50 : 68;
  const gold = index % 2 === 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        pointerEvents="none"
        width={size}
        height={size}
        viewBox="0 0 68 68"
        style={{ position: "absolute" }}
      >
        <Defs>
          <LinearGradient id={`medal-${index}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gold ? "#fff5cc" : "#f5fbff"} />
            <Stop offset=".5" stopColor={gold ? "#e6bc50" : "#b9cbd6"} />
            <Stop offset="1" stopColor={gold ? "#b88821" : "#7e9ba7"} />
          </LinearGradient>
        </Defs>
        <Path
          d="M18 3 L34 12 L50 3 L49 27 L19 27Z"
          fill={gold ? c.tennis : "#aebdcb"}
        />
        <Circle
          cx={34}
          cy={39}
          r={25}
          fill={`url(#medal-${index})`}
          stroke={gold ? "#a87a18" : "#77929f"}
        />
        <Circle cx={34} cy={39} r={19} fill="none" stroke="#ffffffa0" />
      </Svg>
      <View style={{ paddingTop: small ? 6 : 10 }}>
        <AppIcon
          name={index === 0 ? "compete" : index === 1 ? "running" : "progress"}
          size={small ? 20 : 24}
          color={gold ? "#6f5013" : c.ink}
        />
      </View>
    </View>
  );
}
function ProfileDetail({
  page,
  identity,
  saveIdentity,
  pins,
  savePins,
  visibility,
  setVisibility,
  metric,
  setMetric,
  card,
}: {
  page: Page;
  identity: ProfileIdentity;
  saveIdentity: (v: ProfileIdentity) => void;
  pins: string[];
  savePins: (v: string[]) => void;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  metric: boolean;
  setMetric: (v: boolean) => void;
  card: (publicMode: boolean) => React.ReactNode;
}) {
  const nav = useStudyNav();
  if (page.key === "edit")
    return <IdentityEditor identity={identity} save={saveIdentity} />;
  if (page.key === "pins") return <PinEditor pins={pins} save={savePins} />;
  if (page.key === "session")
    return <ProgressDetail page={page} sport="running" metric={metric} />;
  if (page.key === "profile-record") {
    const record = profileRecords.find((r) => r.id === page.id)!;
    const a = trainingRows.find(
      (a) => a.startedAt.startsWith(record.source) && a.sport === "running",
    )!;
    return (
      <>
        <Pill>Running · {record.label}</Pill>
        <T role="display">
          {record.id === "longest" && metric ? "11.1 km" : record.value}
        </T>
        <T secondary>
          {record.date} · {identity.name}
        </T>
        <Surface style={{ gap: 12 }}>
          <T role="heading">{record.note}</T>
          <T role="caption" secondary>
            {record.id === "streak"
              ? "Counted training in each of four consecutive Eastern weeks."
              : "Derived from recorded activity; no separate award is added by this preview."}
          </T>
        </Surface>
        <Plot
          values={
            record.id === "longest" && metric
              ? record.values.map((v) => v * 1.609344)
              : record.values
          }
          labels={["Jun", "Jul", "Aug", "Sep", record.date]}
          unit={record.id === "longest" && metric ? "km" : record.unit}
        />
        <T role="caption" secondary>
          {record.id === "5k" || record.id === "10k"
            ? "Lower is faster · Qualifying attempt history"
            : "Recorded milestone history"}
        </T>
        <Action
          label={
            record.id === "streak"
              ? "View the latest counted session"
              : "View the source session"
          }
          onPress={() =>
            nav.push({ key: "session", title: sessionName(a), id: a.id })
          }
        />
      </>
    );
  }
  if (page.key === "share")
    return (
      <>
        <T role="display">Your athlete card.</T>
        <T secondary>Preview the identity and highlights others will see.</T>
        {card(true)}
        <Surface style={stack}>
          <T role="label">Link preview</T>
          <T secondary>overtaek.example/alex</T>
          <T role="caption" secondary>
            This is a local preview; no public link is created or shared.
          </T>
        </Surface>
      </>
    );
  if (page.key === "visibility")
    return (
      <>
        <T role="display">Make it yours.</T>
        <T secondary>
          Your card and high-level training stats form your public profile.
          Account settings and email stay private.
        </T>
        {[
          {
            key: "city" as const,
            title: "Show my city",
            note: "Include your city on your athlete card.",
          },
          {
            key: "records" as const,
            title: "Show card highlights",
            note: "Include the PBs you pinned to your card.",
          },
        ].map((s) => (
          <View
            key={s.key}
            style={{
              ...row,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <T role="label">{s.title}</T>
              <T secondary>{s.note}</T>
            </View>
            <Switch
              accessibilityLabel={s.title}
              value={visibility[s.key]}
              onValueChange={(v) =>
                setVisibility({ ...visibility, [s.key]: v })
              }
              trackColor={{ true: c.secondary }}
            />
          </View>
        ))}
        <Action
          label="Preview my public card"
          secondary
          onPress={() =>
            nav.push({ key: "share", title: "Public card preview" })
          }
        />
        <T role="caption" secondary>
          Local visibility preview. It does not change account privacy or
          publish data.
        </T>
      </>
    );
  if (page.key === "preferences")
    return (
      <>
        <SectionHeader
          title="Distance units"
          subtitle="Update the distance labels in this profile preview."
        />
        <FocusSegments
          label="Distance units"
          value={metric ? "metric" : "us"}
          options={[
            { value: "us", label: "Miles" },
            { value: "metric", label: "Kilometers" },
          ]}
          onChange={(v) => setMetric(v === "metric")}
        />
        <Surface style={stack}>
          <T role="label">Primary sport</T>
          <View style={row}>
            <AppIcon name="running" />
            <T>Running</T>
          </View>
          <T role="caption" secondary>
            Sport registration stays in the current app’s preferences flow.
            Units here are a local preview.
          </T>
        </Surface>
      </>
    );
  if (page.key === "notifications") return <NotificationPreferences />;
  if (page.key === "sync")
    return (
      <>
        <T role="display">Your activity, together.</T>
        <T secondary>Import counted workouts from the sources you choose.</T>
        {(["apple_health", "strava", "garmin"] as const).map((id) => (
          <Tap
            key={id}
            onPress={() =>
              nav.push({
                key: "provider",
                title:
                  id === "apple_health"
                    ? "Apple Health"
                    : id === "strava"
                      ? "Strava"
                      : "Garmin",
                id,
              })
            }
            style={{
              ...row,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <IntegrationIcon provider={id} />
            <View style={{ flex: 1 }}>
              <T role="label">
                {id === "apple_health"
                  ? "Apple Health"
                  : id === "strava"
                    ? "Strava"
                    : "Garmin"}
              </T>
              <T role="caption" secondary>
                Not connected in this preview
              </T>
            </View>
            <AppIcon name="chevron" />
          </Tap>
        ))}
        <T role="caption" secondary>
          No connection is inferred from the fictional activities shown
          elsewhere.
        </T>
      </>
    );
  if (page.key === "provider")
    return (
      <>
        <IntegrationIcon provider={page.id as "strava"} />
        <T role="display">{page.title}</T>
        <T>
          Bring your activity into your training history and weekly competition.
        </T>
        <Surface style={stack}>
          <T role="label">You choose what to connect</T>
          <T secondary>
            Recorded workouts, moving time and supported GPS activity.
            Connection and permission are managed through your real account.
          </T>
        </Surface>
        <Pill>Preview · Not connected</Pill>
        <Action label="Back to Data Sync" secondary onPress={nav.back} />
      </>
    );
  if (page.key === "scoring")
    return (
      <>
        <T role="display">Effort, made visible.</T>
        <Surface style={stack}>
          <T role="heading">Open score</T>
          <T>All eligible counted sessions, including manual entries.</T>
          <Rule />
          <T role="heading">GPS score</T>
          <T>Verified GPS activity only. It has an independent rating.</T>
        </Surface>
        <T secondary>
          Weeks run Monday to Monday in America/New_York. Activity milestones
          and final placement use the existing scoring rules. Rest markers and
          public profile highlights don’t change your rating.
        </T>
      </>
    );
  if (page.key === "account")
    return (
      <>
        <SectionHeader title="Sign-in details" />
        <Surface style={stack}>
          <T role="label">Email</T>
          <T>alex@example.test</T>
          <T role="caption" secondary>
            Visible only in the owner account screen.
          </T>
        </Surface>
        <T role="heading">Account controls</T>
        <T secondary>
          The live app’s Account screen contains Sign out, Report an issue and
          Delete account. This design preview keeps those actions within
          Account.
        </T>
        <SettingsRow
          title="Sign out"
          detail="End your current app session"
          onPress={() => nav.push({ key: "account-action", title: "Sign out" })}
        />
        <SettingsRow
          title="Report an issue"
          detail="Get help with your account"
          onPress={() =>
            nav.push({ key: "account-action", title: "Report an issue" })
          }
        />
        <SettingsRow
          title="Delete account"
          detail="Review account deletion"
          onPress={() =>
            nav.push({ key: "account-action", title: "Delete account" })
          }
        />
      </>
    );
  if (page.key === "account-action")
    return (
      <>
        <T role="display">{page.title}</T>
        <T secondary>
          You’re reviewing a local athlete profile. Account actions are
          available in your signed-in production account.
        </T>
        <Action label="Return to Account" secondary onPress={nav.back} />
      </>
    );
  return (
    <>
      {[
        { title: "Edit profile", detail: "Name, city and bio", key: "edit" },
        {
          title: "Card highlights",
          detail: "Choose three personal bests",
          key: "pins",
        },
        { title: "Data Sync", detail: "Connections and imports", key: "sync" },
        { title: "Preferences", detail: "Units and sport", key: "preferences" },
        {
          title: "Notifications",
          detail: "Choose your reminders",
          key: "notifications",
        },
        {
          title: "Public profile",
          detail: "City and highlight visibility",
          key: "visibility",
        },
        {
          title: "How scoring works",
          detail: "Open, GPS and weekly effort",
          key: "scoring",
        },
        {
          title: "Account",
          detail: "Sign-in and account controls",
          key: "account",
        },
      ].map((s) => (
        <SettingsRow
          key={s.key}
          title={s.title}
          detail={s.detail}
          onPress={() => nav.push({ key: s.key, title: s.title })}
        />
      ))}
    </>
  );
}
function IdentityEditor({
  identity,
  save,
}: {
  identity: ProfileIdentity;
  save: (v: ProfileIdentity) => void;
}) {
  const [draft, setDraft] = useState(identity),
    [error, setError] = useState("");
  const nav = useStudyNav();
  return (
    <>
      <T secondary>Your name, city and bio appear on your athlete card.</T>
      {(
        [
          { key: "name", label: "Display name", max: 50 },
          { key: "city", label: "City", max: 60 },
          { key: "bio", label: "Bio", max: 140 },
        ] as const
      ).map((f) => (
        <View key={f.key} style={{ gap: 8 }}>
          <T role="label">{f.label}</T>
          <TextInput
            accessibilityLabel={f.label}
            value={draft[f.key]}
            onChangeText={(v) => setDraft({ ...draft, [f.key]: v })}
            maxLength={f.max}
            multiline={f.key === "bio"}
            style={{
              ...textStyle("body"),
              minHeight: f.key === "bio" ? 110 : 52,
              padding: 14,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 14,
              color: c.ink,
            }}
          />
        </View>
      ))}
      {Boolean(error) && (
        <T role="label" accessibilityLiveRegion="polite">
          {error}
        </T>
      )}
      <Action
        label="Save profile preview"
        onPress={() => {
          if (!draft.name.trim()) {
            setError("Add a display name to continue.");
            return;
          }
          save({
            name: draft.name.trim(),
            city: draft.city.trim(),
            bio: draft.bio.trim(),
          });
          nav.back();
        }}
      />
      <T role="caption" secondary>
        Edits stay local to this concept until reload.
      </T>
    </>
  );
}
function PinEditor({
  pins,
  save,
}: {
  pins: string[];
  save: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState(pins);
  const nav = useStudyNav();
  return (
    <>
      <T role="display">Your three highlights.</T>
      <T secondary>Choose up to three records for your athlete card.</T>
      <Pill>{draft.length} of 3 selected</Pill>
      {profileRecords.map((r) => (
        <View
          key={r.id}
          style={{
            ...row,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <AppIcon name="compete" />
          <View style={{ flex: 1 }}>
            <T role="heading">{r.value}</T>
            <T secondary>
              {r.label} · {r.date}
            </T>
          </View>
          <Switch
            accessibilityLabel={`Pin ${r.label}`}
            disabled={!draft.includes(r.id) && draft.length === 3}
            value={draft.includes(r.id)}
            onValueChange={(v) =>
              setDraft(v ? [...draft, r.id] : draft.filter((id) => id !== r.id))
            }
            trackColor={{ true: c.secondary }}
          />
        </View>
      ))}
      <Action
        label="Save card highlights"
        onPress={() => {
          save(draft);
          nav.back();
        }}
      />
    </>
  );
}
function NotificationPreferences() {
  const [weekly, setWeekly] = useState(true),
    [sessions, setSessions] = useState(true);
  return (
    <>
      {[
        {
          title: "Weekly results",
          note: "When a competition week settles",
          value: weekly,
          set: setWeekly,
        },
        {
          title: "Crew sessions",
          note: "Reminders for plans you joined",
          value: sessions,
          set: setSessions,
        },
      ].map((s) => (
        <View
          key={s.title}
          style={{
            ...row,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <View style={{ flex: 1 }}>
            <T role="label">{s.title}</T>
            <T secondary>{s.note}</T>
          </View>
          <Switch
            accessibilityLabel={s.title}
            value={s.value}
            onValueChange={s.set}
            trackColor={{ true: c.secondary }}
          />
        </View>
      ))}
      <T role="caption" secondary>
        Local settings preview. Notification permission and delivery are not
        changed.
      </T>
    </>
  );
}
