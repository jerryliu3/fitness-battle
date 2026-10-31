export type AppleHealthKitNative = {
  initHealthKit: (permissions: unknown, cb: (error: string) => void) => void;
  getAnchoredWorkouts: (
    options: { startDate: string; endDate?: string; type?: string },
    cb: (
      error: string | { message?: string } | null,
      results: { data?: unknown[] },
    ) => void,
  ) => void;
};

export type AppleHealthKitConstants = {
  Permissions: { Workout: string; [key:string]:string };
};

export type AppleHealthKitModule = AppleHealthKitNative & {
  Constants: AppleHealthKitConstants;
  [key: string]: unknown;
};

export type AppleHealthKitPackageExport = {
  Constants?: AppleHealthKitConstants;
  default?: { Constants?: AppleHealthKitConstants };
  initHealthKit?: unknown;
  getAnchoredWorkouts?: unknown;
};

export type ResolveAppleHealthKitInput = {
  platform: string;
  /** Live NativeModules.AppleHealthKit (lazy under New Architecture). */
  nativeModule: AppleHealthKitNative | null | undefined;
  /**
   * Value of require("react-native-health"). Under New Architecture this often
   * only has Constants because the package Object.assigns an empty module.
   */
  packageExport: AppleHealthKitPackageExport | null | undefined;
};

/**
 * Bind HealthKit from NativeModules at call time.
 * Do not call methods from the package export — they are often undefined on
 * New Architecture even when the native module is linked.
 */
export function resolveAppleHealthKit(
  input: ResolveAppleHealthKitInput,
): AppleHealthKitModule | "unavailable" | "unsupported" {
  if (input.platform !== "ios") return "unsupported";

  const constants =
    input.packageExport?.Constants ?? input.packageExport?.default?.Constants;
  const native = input.nativeModule;

  if (
    typeof native?.initHealthKit !== "function" ||
    typeof native?.getAnchoredWorkouts !== "function" ||
    !constants?.Permissions?.Workout
  ) {
    return "unavailable";
  }

  const extra = Object.fromEntries(["getDailyStepCountSamples","getRestingHeartRateSamples","getHeartRateVariabilitySamples","getSleepSamples","getWorkoutRouteSamples"].flatMap(key=>{const fn=(native as unknown as Record<string,unknown>)[key];return typeof fn === "function"?[[key,fn.bind(native)]]:[];}));
  return {
    ...extra,
    initHealthKit: native.initHealthKit.bind(native),
    getAnchoredWorkouts: native.getAnchoredWorkouts.bind(native),
    Constants: constants,
  };
}

/** True when the package export looks like the New Architecture Object.assign bug. */
export function packageExportMissingNativeMethods(
  packageExport: AppleHealthKitPackageExport | null | undefined,
): boolean {
  return (
    !!packageExport?.Constants?.Permissions?.Workout &&
    typeof packageExport.initHealthKit !== "function"
  );
}
