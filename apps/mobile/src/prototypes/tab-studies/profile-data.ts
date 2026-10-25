import type { StudyConcept } from "./kit";
export const profileConcepts = [
  {
    id: "card",
    name: "Athlete Card",
    thesis:
      "An approachable identity card, a clean stat line, and a compact achievement shelf.",
    tradeoff: "The most familiar option, with less room for personality.",
  },
  {
    id: "passport",
    name: "Athletic Passport",
    thesis:
      "An athletic passport gathers sport credentials, earned stamps and a personal story.",
    tradeoff:
      "A strong collection metaphor needs restraint as achievements grow.",
  },
  {
    id: "cover",
    name: "Cover Story",
    thesis:
      "A landscape cover and editorial identity frame the athlete’s story before the numbers.",
    tradeoff: "More expressive, but the hero uses valuable phone height.",
  },
  {
    id: "cabinet",
    name: "Record Cabinet",
    thesis:
      "Personal bests are the main objects; the person and account controls form a quiet frame.",
    tradeoff:
      "Best for established athletes; a new account needs an empty collection.",
  },
] as const satisfies readonly StudyConcept[];
export type ProfileDraft = { name: string; city: string; bio: string };
export type Visibility = { city: boolean; records: boolean };
export const initialProfile: ProfileDraft = {
  name: "Alex Lee",
  city: "Brooklyn, NY",
  bio: "Easy miles, long rides, and a little better every week.",
};
/** Deliberately excludes email, health readings, settings and private crew data. */
export function publicIdentity(profile: ProfileDraft, visibility: Visibility) {
  return {
    name: profile.name,
    city: visibility.city ? profile.city : null,
    bio: profile.bio,
    showRecords: visibility.records,
  };
}
export const achievements = [
  {
    title: "10 active weeks",
    detail:
      "At least one counted activity in ten separate Eastern calendar weeks. Sample read-only milestone, not a daily streak requirement.",
    label: "CONSISTENCY",
    value: "10",
  },
  {
    title: "First podium",
    detail:
      "A top-three finish in a settled weekly field. Sample Running / Open result, September 28–October 4.",
    label: "COMPETITION",
    value: "03",
  },
  {
    title: "100 sessions",
    detail:
      "One hundred sample counted sessions across sports. No reward or entitlement is introduced.",
    label: "SHOWING UP",
    value: "100",
  },
] as const;
