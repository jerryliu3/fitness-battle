// Expand this list as legacy screens adopt the semantic adapters.
export const files = [
  "apps/mobile/src/features/club-achievements.tsx",
  "apps/mobile/src/features/club-latest-activity.tsx",
  "apps/mobile/src/features/training-atlas.tsx",
  "apps/mobile/src/features/training-history.tsx",
  "apps/web/src/features/club/achievements.tsx",
  "apps/web/src/features/club/latest-activity.tsx",
  "apps/web/src/features/progress/training-atlas.tsx",
  "apps/web/src/features/progress/training-history.tsx",
];
// Explicit metric/chart exceptions, rather than allowing arbitrary feature typography.
export const exceptions = {
  "apps/mobile/src/features/training-atlas.tsx": [
    'fontSize: 38', 'fontFamily: "DMSans_700Bold"', 'fontSize: 10',
  ],
};
