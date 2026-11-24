"use client";

import { GuestEntrySheet } from "@/components/guest-entry-sheet";
import { OpenInAppBanner } from "@/components/open-in-app-banner";
import { useGuestEntryPrompt } from "@/lib/guest-entry";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { AwardShelf } from "@/features/you/award-shelf";
import {
  athleteCardModelForPeer,
  distanceUnitLabel,
  formatDistanceM,
  publicAthleteNativePath,
  publicAthleteWebDestination,
  type AwardCardModel,
  type AthleteCardModel,
  type ClubAchievement,
} from "@fitness-battle/shared";
import { AppHeading, AppParagraph, SectionHeader } from "@/ui/section";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PublicProfilePayload = {
  card: AthleteCardModel;
  awards: AwardCardModel[];
  achievements: ClubAchievement[];
  season: { meters: number; sessions: number; weeks: number };
  units: "metric" | "us";
  proudMoments: { id: string; label: string; detail: string }[];
  memberSince: string | null;
};

export function AthletePublicView({ athleteId }: { athleteId: string }) {
  const path = usePathname();
  const params = useSearchParams();
  const nextPath = useMemo(() => {
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }, [params, path]);
  const guest = useGuestEntryPrompt({
    enabled: true,
    nextPath: publicAthleteWebDestination(athleteId),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<PublicProfilePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/athletes/${encodeURIComponent(athleteId)}/profile`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "profile_unavailable");
        }
        return response.json() as Promise<PublicProfilePayload>;
      })
      .then((payload) => {
        if (!cancelled) setRemote(payload);
      })
      .catch((e) => {
        if (!cancelled) {
          setRemote(null);
          setError(e instanceof Error ? e.message : "Could not load this profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const card = useMemo(() => {
    if (remote?.card) return remote.card;
    return athleteCardModelForPeer({ name: "Athlete" });
  }, [remote?.card]);

  const units = remote?.units ?? "us";

  return (
  <>
  <OpenInAppBanner nativePath={publicAthleteNativePath(athleteId)} />
  <div className="focus-athlete" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {loading ? (
      <AppParagraph typographyRole="body" className="fb-copy">
        Loading profile…
      </AppParagraph>
    ) : null}
    {error && !remote ? (
      <section className="fb-card">
        <AppHeading level={1} role="display" className="fb-title">
          Profile unavailable
        </AppHeading>
        <AppParagraph typographyRole="body" className="fb-copy">
          This athlete profile could not be loaded right now.
        </AppParagraph>
      </section>
    ) : (
      <>
        <AthleteCrest model={card} />
        {remote?.achievements?.length ? (
          <section className="fb-card">
            <SectionHeader title="Achievements" />
            <AppParagraph typographyRole="caption" className="fb-note">
              {remote.achievements.map((row) => row.title).join(" · ")}
            </AppParagraph>
          </section>
        ) : null}
        {remote?.awards?.length ? (
          <section className="fb-card">
            <SectionHeader title="Podium & awards" />
            <AwardShelf cards={remote.awards} />
          </section>
        ) : null}
        {remote?.season ? (
          <section className="fb-card">
            <SectionHeader title="Since the first mile" subtitle="Counted training" />
            <PublicSeasonStats
              season={remote.season}
              units={units}
              overtakes={card.overtakes ?? 0}
              sportName={card.sport}
            />
          </section>
        ) : null}
        {remote?.proudMoments?.length ? (
          <section className="fb-card">
            <SectionHeader title="A few proud moments" />
            <ul className="focus-crew-preview-list">
              {remote.proudMoments.map((moment) => (
                <li key={moment.id}>
                  <b>{moment.label}</b>
                  <span>{moment.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    )}
  </div>
  <GuestEntrySheet
    open={guest.open}
    reason="Sign in to follow athletes and join them on the field."
    nextPath={publicAthleteWebDestination(athleteId)}
    onClose={guest.dismiss}
  />
  </>
  );
}

function PublicSeasonStats({
  season,
  units,
  overtakes,
  sportName,
}: {
  season: { meters: number; sessions: number; weeks: number };
  units: "metric" | "us";
  overtakes: number;
  sportName?: string;
}) {
  return (
    <div className="fb-row" style={{ justifyContent: "space-around", flexWrap: "wrap", gap: 12 }}>
      <Stat label={`${distanceUnitLabel(units)} total`} value={formatDistanceM(season.meters, units)} />
      <Stat label="Sessions" value={String(season.sessions)} />
      <Stat label="Active weeks" value={String(season.weeks)} />
      <Stat label="Overtakes" value={String(overtakes)} />
      {sportName ? <Stat label="Primary sport" value={sportName} /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 72 }}>
      <AppParagraph typographyRole="display" style={{ margin: 0 }}>
        {value}
      </AppParagraph>
      <AppParagraph typographyRole="caption" className="fb-note" style={{ margin: 0 }}>
        {label}
      </AppParagraph>
    </div>
  );
}