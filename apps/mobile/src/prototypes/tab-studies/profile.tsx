import { useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  Action,
  Avatar,
  Card,
  Copy,
  Door,
  Drilldown,
  Heading,
  InspectChart,
  Row,
  Screen,
  Segments,
  Stack,
  Stat,
  Study,
  palette,
  useDrilldown,
  type StudyConcept,
} from "./kit";
import {
  achievements,
  initialProfile,
  profileConcepts,
  publicIdentity,
  type ProfileDraft,
  type Visibility,
} from "./profile-data";
import { records } from "./progress-data";

export default function ProfileStudy() {
  return (
    <Study
      title="Profile / Four identities"
      tab="Profile"
      concepts={profileConcepts}
      render={(concept) => <ProfileConcept concept={concept} />}
    />
  );
}
function ProfileConcept({ concept }: { concept: StudyConcept }) {
  const [mode, setMode] = useState<"Owner" | "Public">("Owner");
  const [profile, setProfile] = useState<ProfileDraft>({ ...initialProfile });
  const [visibility, setVisibility] = useState<Visibility>({
    city: true,
    records: true,
  });
  const [newAccount, setNewAccount] = useState(false);
  const drill = useDrilldown();
  const publicView = publicIdentity(profile, visibility);
  const publicMode = mode === "Public";
  const showRecords = !publicMode || publicView.showRecords;
  const openAchievement = (index: number) =>
    drill.push({
      title: achievements[index].title,
      render: () => (
        <>
          <Heading eyebrow="Earned highlight / Sample">
            {achievements[index].title}
          </Heading>
          <Card gold>
            <Copy size={64} bold>
              {achievements[index].value}
            </Copy>
            <Copy>{achievements[index].detail}</Copy>
          </Card>
          <Copy muted>
            Public milestone details use high-level results. They do not reveal
            private health readings or crew activity.
          </Copy>
        </>
      ),
    });
  const openRecord = (index: number) =>
    drill.push({
      title: records[index].title,
      render: () => (
        <>
          <Heading eyebrow="Personal best / Sample">
            {records[index].title}
          </Heading>
          <Stat value={records[index].value} label={records[index].date} big />
          <Card>
            <Copy bold>{records[index].activity}</Copy>
            <Copy>{records[index].detail}</Copy>
            <Copy muted>
              {publicMode
                ? "Shared summary only. Private source data is not included."
                : "Owner source summary. A production detail would open the existing activity receipt."}
            </Copy>
          </Card>
          {!publicMode && (
            <Door
              title="Record history"
              note={`Previous: ${records[index].previous}`}
              onPress={() =>
                drill.push({
                  title: "Record history",
                  render: () => (
                    <>
                      <Heading>{records[index].title}</Heading>
                      <Row>
                        <Stat
                          value={records[index].previous}
                          label="Previous sample best"
                        />
                        <Stat
                          value={records[index].value}
                          label="Current sample best"
                        />
                      </Row>
                      <Copy muted>
                        Only qualifying counted performances would appear. This
                        is a presentation fixture.
                      </Copy>
                    </>
                  ),
                })
              }
            />
          )}
        </>
      ),
    });
  const openStats = () =>
    drill.push({
      title: "Athlete statistics",
      render: () => (
        <>
          <Heading eyebrow={profile.name}>The longer story.</Heading>
          <Row>
            <Stat value={newAccount ? "0" : "128"} label="Counted sessions" />
            <Stat value={newAccount ? "0" : "26"} label="Settled weeks" />
          </Row>
          {newAccount ? (
            <Copy muted>
              Statistics will begin after counted activity. No sample activity
              is substituted.
            </Copy>
          ) : (
            <>
              <InspectChart
                values={[14.3, 16.1, 18.2, 16.9, 17.1, 15.3]}
                labels={["May", "Jun", "Jul", "Aug", "Sep", "Oct"]}
                unit="h"
              />
              <Row>
                <Stat value="412 mi" label="Running distance" />
                <Stat value="146.4 h" label="Across all sports" />
              </Row>
              <Copy muted>
                Public high-level training totals only. Health signals and
                individual private sessions are not shown.
              </Copy>
            </>
          )}
        </>
      ),
    });
  const openEdit = () =>
    drill.push({
      title: "Edit profile",
      render: () => (
        <EditProfile
          initial={profile}
          save={(value) => {
            setProfile(value);
            drill.close();
          }}
        />
      ),
    });
  const openSettings = () =>
    drill.push({
      title: "Settings",
      render: () => (
        <>
          <Heading>Your account, your way.</Heading>
          <Door
            title="Edit profile"
            note="Name, city & biography"
            onPress={openEdit}
          />
          <Door
            title="Data Sync"
            note="No live connection in this study"
            onPress={() =>
              drill.push({
                title: "Data Sync",
                render: () => (
                  <>
                    <Heading>Your activity sources.</Heading>
                    {["Apple Health", "Strava", "Garmin imports"].map(
                      (name) => (
                        <Card key={name}>
                          <Copy bold>{name}</Copy>
                          <Copy muted>Not connected in this prototype.</Copy>
                        </Card>
                      ),
                    )}
                    <Copy>
                      No OAuth or health permission is requested here.
                      Production would use the existing tracker and import
                      flows.
                    </Copy>
                  </>
                ),
              })
            }
          />
          <Door
            title="Preferences"
            note="Units and notifications · Local only"
            onPress={() =>
              drill.push({
                title: "Preferences",
                render: () => <Preferences />,
              })
            }
          />
          <Door
            title="Public profile visibility"
            note="Preview city and record visibility"
            onPress={() =>
              drill.push({
                title: "Visibility preview",
                render: () => (
                  <VisibilityPreview
                    initial={visibility}
                    onChange={setVisibility}
                  />
                ),
              })
            }
          />
          <Door
            title="How scoring works"
            note="Weekly volume and effort are separate"
            onPress={() =>
              drill.push({
                title: "Scoring",
                render: () => (
                  <>
                    <Heading>Every week, a fresh field.</Heading>
                    <Copy>
                      Weeks run Monday–Monday, America/New_York, with start
                      included and end excluded. Weekly volume determines place;
                      effort rating has its own history. Open and GPS are
                      separate tracks.
                    </Copy>
                    <Copy muted>
                      No scoring rule is changed by these prototypes.
                    </Copy>
                  </>
                ),
              })
            }
          />
          <Door
            title="Account"
            note="Private account information"
            onPress={() =>
              drill.push({
                title: "Account",
                render: () => (
                  <>
                    <Heading>Account.</Heading>
                    <Card>
                      <Copy bold>alex@example.test</Copy>
                      <Copy muted>Fictional private email · Owner only</Copy>
                    </Card>
                    <Copy>
                      Sign out, support and deletion belong here in the
                      production account flow. This prototype does not change
                      authentication or delete data.
                    </Copy>
                    <Door
                      title="Account action preview"
                      note="Read-only explanation"
                      onPress={() =>
                        drill.push({
                          title: "Account actions",
                          render: () => (
                            <>
                              <Heading>A deliberate next step.</Heading>
                              <Copy>
                                Production sign-out would end the session.
                                Production deletion requires the existing
                                confirmation and server action. Neither is
                                executed in this study.
                              </Copy>
                            </>
                          ),
                        })
                      }
                    />
                  </>
                ),
              })
            }
          />
        </>
      ),
    });
  const badges = (
    <Stack gap={12}>
      <Heading eyebrow="Earned / Sample">A few things to keep.</Heading>
      {newAccount ? (
        <Card>
          <Copy bold>Your story starts here.</Copy>
          <Copy muted>
            Achievements appear after qualifying counted activity. There is no
            empty trophy to claim.
          </Copy>
        </Card>
      ) : (
        <Row style={{ alignItems: "stretch", gap: 8 }}>
          {achievements.map((a, i) => (
            <Pressable
              key={a.title}
              accessibilityRole="button"
              accessibilityLabel={`Open ${a.title} achievement`}
              onPress={() => openAchievement(i)}
              style={{
                flex: 1,
                backgroundColor: i === 1 ? palette.soft : "white",
                borderRadius: 18,
                padding: 13,
                gap: 10,
              }}
            >
              <Copy size={28} bold>
                {a.value}
              </Copy>
              <Copy size={11} bold>
                {a.title}
              </Copy>
            </Pressable>
          ))}
        </Row>
      )}
    </Stack>
  );
  const recordShelf = showRecords && (
    <Stack gap={0}>
      <Copy size={12} bold>
        PERSONAL BESTS
      </Copy>
      {newAccount ? (
        <Copy muted>No qualifying records yet.</Copy>
      ) : (
        records.map((record, i) => (
          <Door
            key={record.title}
            title={record.title}
            note={record.date}
            value={record.value}
            onPress={() => openRecord(i)}
          />
        ))
      )}
    </Stack>
  );
  const summary = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open athlete statistics"
      onPress={openStats}
    >
      <Row>
        <Stat value={newAccount ? "0" : "128"} label="Sessions" />
        <Stat value={newAccount ? "0" : "26"} label="Settled weeks" />
        <Stat
          value={newAccount ? "—" : "1,186"}
          label="Running / Open rating"
        />
      </Row>
    </Pressable>
  );
  const identity = (
    <Stack gap={10}>
      <Heading eyebrow={publicMode ? "Public athlete" : "Your athlete profile"}>
        {publicView.name}
      </Heading>
      {(!publicMode || publicView.city) && (
        <Copy muted>{profile.city} · Member since May 2026</Copy>
      )}
      <Copy>{publicView.bio}</Copy>
    </Stack>
  );
  let content;
  switch (concept.id) {
    case "passport":
      content = (
        <>
          <Card dark>
            <Row>
              <Copy size={11} muted>
                OVERTAEK / ATHLETIC PASSPORT
              </Copy>
              <Copy size={11}>№ 026</Copy>
            </Row>
            <Row>
              <Avatar name={profile.name} size={75} gold />
              <View style={{ flex: 1, gap: 5 }}>
                <Copy size={27} bold>
                  {publicView.name}
                </Copy>
                <Copy size={12} muted>
                  {publicMode && !publicView.city
                    ? "City private"
                    : profile.city}
                </Copy>
              </View>
            </Row>
            <Copy size={12}>RUNNING / CYCLING / STRENGTH</Copy>
            <Copy size={11} muted>
              MEMBER SINCE MAY 2026
            </Copy>
          </Card>
          <Copy size={18}>{profile.bio}</Copy>
          {summary}
          {badges}
          {recordShelf}
        </>
      );
      break;
    case "cover":
      content = (
        <>
          <View
            style={{
              height: 175,
              backgroundColor: "#dce9e4",
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <Svg width="100%" height="175" viewBox="0 0 360 175">
              <Path
                d="M-20 190 L80 35 L170 140 L245 5 L390 190"
                fill="#a9c5ba"
              />
              <Path
                d="M-20 190 L95 110 L185 153 L270 65 L390 190"
                fill="#176c75"
              />
              <Path
                d="M50 175 Q150 120 218 155 T360 100"
                fill="none"
                stroke="#f7c948"
                strokeWidth="4"
              />
            </Svg>
          </View>
          <View style={{ marginTop: -54, marginLeft: 18 }}>
            <Avatar name={profile.name} size={86} gold />
          </View>
          {identity}
          <Card gold>{summary}</Card>
          <Copy size={21} bold>
            Everyday effort. A longer story.
          </Copy>
          {recordShelf}
          {badges}
          <Door title="Full athlete statistics" onPress={openStats} />
        </>
      );
      break;
    case "cabinet":
      content = (
        <>
          <Row>
            <Avatar name={profile.name} size={53} gold />
            <View style={{ flex: 1 }}>
              <Copy size={25} bold>
                {profile.name}
              </Copy>
              <Copy size={12} muted>
                {publicMode && !publicView.city ? "Athlete" : profile.city}
              </Copy>
            </View>
          </Row>
          <Heading eyebrow="Personal collection">A cabinet of effort.</Heading>
          {showRecords ? (
            newAccount ? (
              <Card>
                <Copy bold>Your first record is ahead.</Copy>
                <Copy muted>Qualifying performances will appear here.</Copy>
              </Card>
            ) : (
              records.map((record, i) => (
                <Pressable
                  key={record.title}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${record.title} record`}
                  onPress={() => openRecord(i)}
                >
                  <Card dark={i === 0} gold={i === 1}>
                    <Row>
                      <Copy size={12}>{record.title.toUpperCase()}</Copy>
                      <Copy size={11}>{record.date}</Copy>
                    </Row>
                    <Copy size={48} bold>
                      {record.value}
                    </Copy>
                    <Copy size={12} muted>
                      {record.activity} →
                    </Copy>
                  </Card>
                </Pressable>
              ))
            )
          ) : (
            <Card>
              <Copy muted>
                Personal records are hidden in this public preview.
              </Copy>
            </Card>
          )}
          {summary}
          {badges}
          <Copy>{profile.bio}</Copy>
        </>
      );
      break;
    default:
      content = (
        <>
          <Row>
            <Avatar name={profile.name} size={78} gold />
            <View style={{ flex: 1 }}>
              <Copy size={12} muted>
                MEMBER SINCE MAY 2026
              </Copy>
              <Copy size={30} bold>
                {profile.name}
              </Copy>
              <Copy size={13} muted>
                {publicMode && !publicView.city ? "City private" : profile.city}
              </Copy>
            </View>
          </Row>
          <Copy>{profile.bio}</Copy>
          <Card gold>{summary}</Card>
          {badges}
          {recordShelf}
          <Door
            title="Full athlete statistics"
            note="High-level totals and training history"
            onPress={openStats}
          />
        </>
      );
  }
  return (
    <>
      <Screen>
        <Row>
          <Copy size={12} bold>
            ATHLETE
          </Copy>
          <Copy size={10} muted>
            Fictional study
          </Copy>
        </Row>
        <Segments
          options={["Owner", "Public"]}
          value={mode}
          onChange={setMode}
        />
        {content}
        {publicMode ? (
          <Card>
            <Copy size={12} muted>
              Public preview · Shared identity, high-level statistics and
              visible highlights. No email, settings, health readings or private
              crew data.
            </Copy>
          </Card>
        ) : (
          <Stack gap={0}>
            <Row>
              <Action label="Edit profile" primary onPress={openEdit} />
              <Action label="Settings →" onPress={openSettings} />
            </Row>
            <Door
              title="Public profile preview"
              note="See the shareable presentation"
              onPress={() => setMode("Public")}
            />
            <Door
              title="Share preview"
              note="Inspect the public card; nothing is published"
              onPress={() =>
                drill.push({
                  title: "Share preview",
                  render: () => (
                    <>
                      <Heading eyebrow="Public card preview">
                        {publicView.name}
                      </Heading>
                      {publicView.city && <Copy muted>{publicView.city}</Copy>}
                      <Copy>{publicView.bio}</Copy>
                      <Row>
                        <Stat
                          value={newAccount ? "0" : "128"}
                          label="Sessions"
                        />
                        <Stat
                          value={newAccount ? "0" : "26"}
                          label="Settled weeks"
                        />
                      </Row>
                      {publicView.showRecords && !newAccount && (
                        <Stat value="24:18" label="Fastest 5K · Sample" />
                      )}
                      <Copy muted>
                        Visual preview only. No profile is published and no link
                        is copied or sent.
                      </Copy>
                    </>
                  ),
                })
              }
            />
          </Stack>
        )}
        <Action
          label={
            newAccount ? "Restore established athlete" : "Preview new athlete"
          }
          onPress={() => setNewAccount(!newAccount)}
        />
      </Screen>
      <Drilldown drill={drill} />
    </>
  );
}
function EditProfile({
  initial,
  save,
}: {
  initial: ProfileDraft;
  save: (value: ProfileDraft) => void;
}) {
  const [draft, setDraft] = useState(initial),
    [error, setError] = useState("");
  return (
    <>
      <Heading>Make it yours.</Heading>
      {(["name", "city", "bio"] as const).map((key) => (
        <Stack key={key} gap={6}>
          <Copy bold>
            {key === "name"
              ? "Display name"
              : key === "city"
                ? "City"
                : "Biography"}
          </Copy>
          <TextInput
            accessibilityLabel={`Profile ${key} draft`}
            value={draft[key]}
            multiline={key === "bio"}
            maxLength={key === "bio" ? 180 : 60}
            onChangeText={(value) =>
              setDraft((previous) => ({ ...previous, [key]: value }))
            }
            style={{
              backgroundColor: "white",
              minHeight: key === "bio" ? 100 : 50,
              padding: 15,
              borderRadius: 12,
              color: palette.ink,
            }}
          />
        </Stack>
      ))}
      <Action
        label="Save local profile"
        primary
        onPress={() =>
          draft.name.trim()
            ? save({
                name: draft.name.trim(),
                city: draft.city.trim(),
                bio: draft.bio.trim(),
              })
            : setError("Enter a display name.")
        }
      />
      {error && <Copy color={palette.coral}>{error}</Copy>}
      <Copy muted>
        Updates this concept’s in-memory owner and public previews. No account
        write.
      </Copy>
    </>
  );
}
function Preferences() {
  const [units, setUnits] = useState<"Miles" | "Kilometers">("Miles"),
    [notifications, setNotifications] = useState(true);
  return (
    <>
      <Heading>Preferences.</Heading>
      <Copy bold>Distance units</Copy>
      <Segments
        options={["Miles", "Kilometers"]}
        value={units}
        onChange={setUnits}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Copy bold>Weekly recap</Copy>
          <Copy size={12} muted>
            Local notification preference preview
          </Copy>
        </View>
        <Switch
          accessibilityLabel="Weekly recap preview"
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ true: palette.teal }}
        />
      </Row>
      <Copy muted>
        Selected: {units}. Recap {notifications ? "on" : "off"}. No system
        permission is requested and no account preference is written.
      </Copy>
    </>
  );
}
function VisibilityPreview({
  initial,
  onChange,
}: {
  initial: Visibility;
  onChange: (value: Visibility) => void;
}) {
  const [local, setLocal] = useState(initial);
  const update = (key: keyof Visibility, value: boolean) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };
  return (
    <>
      <Heading>Your public presentation.</Heading>
      <Row>
        <Copy bold>Show city</Copy>
        <Switch
          accessibilityLabel="Show city in public preview"
          value={local.city}
          onValueChange={(value) => update("city", value)}
          trackColor={{ true: palette.teal }}
        />
      </Row>
      <Row>
        <Copy bold>Show personal bests</Copy>
        <Switch
          accessibilityLabel="Show records in public preview"
          value={local.records}
          onValueChange={(value) => update("records", value)}
          trackColor={{ true: palette.teal }}
        />
      </Row>
      <Copy muted>
        These controls change only the local public/share previews. They do not
        create a privacy guarantee, alter server policies or publish a profile.
      </Copy>
    </>
  );
}
