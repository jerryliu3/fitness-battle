import { describe, expect, it, vi } from "vitest";
import {
  packageExportMissingNativeMethods,
  resolveAppleHealthKit,
  type AppleHealthKitNative,
  type AppleHealthKitPackageExport,
} from "./apple-health-kit";

const constants = {
  Permissions: { Workout: "Workout" },
} as const;

function nativeStub(overrides: Partial<AppleHealthKitNative> = {}): AppleHealthKitNative {
  const initHealthKit: AppleHealthKitNative["initHealthKit"] = (_permissions, cb) => {
    cb("");
  };
  const getAnchoredWorkouts: AppleHealthKitNative["getAnchoredWorkouts"] = (_options, cb) => {
    cb(null, { data: [] });
  };
  return {
    initHealthKit: vi.fn(initHealthKit),
    getAnchoredWorkouts: vi.fn(getAnchoredWorkouts),
    ...overrides,
  };
}

describe("resolveAppleHealthKit", () => {
  it("returns unsupported off iOS", () => {
    expect(
      resolveAppleHealthKit({
        platform: "android",
        nativeModule: nativeStub(),
        packageExport: { Constants: constants },
      }),
    ).toBe("unsupported");
  });

  it("binds methods from NativeModules when the package export only has Constants (New Arch bug)", () => {
    // Exact failure mode from TestFlight: Object.assign({}, lazyNative, { Constants })
    // left initHealthKit undefined on the package export.
    const brokenPackageExport: AppleHealthKitPackageExport = {
      Constants: constants,
      initHealthKit: undefined,
      getAnchoredWorkouts: undefined,
    };
    expect(packageExportMissingNativeMethods(brokenPackageExport)).toBe(true);
    expect(typeof brokenPackageExport.initHealthKit).not.toBe("function");

    const native = nativeStub();
    const resolved = resolveAppleHealthKit({
      platform: "ios",
      nativeModule: native,
      packageExport: brokenPackageExport,
    });

    expect(resolved).not.toBe("unavailable");
    expect(resolved).not.toBe("unsupported");
    if (resolved === "unavailable" || resolved === "unsupported") return;

    expect(typeof resolved.initHealthKit).toBe("function");
    expect(typeof resolved.getAnchoredWorkouts).toBe("function");
    expect(resolved.Constants.Permissions.Workout).toBe("Workout");

    // Calling the bound method must hit NativeModules, not the broken export.
    resolved.initHealthKit({ permissions: { read: [], write: [] } }, () => undefined);
    expect(native.initHealthKit).toHaveBeenCalledOnce();
  });

  it("rejects using the package export when New Arch left methods undefined", () => {
    const brokenPackageExport: AppleHealthKitPackageExport = {
      Constants: constants,
    };
    // Pre-fix sync path: health = require("react-native-health"); health.initHealthKit(...)
    expect(packageExportMissingNativeMethods(brokenPackageExport)).toBe(true);
    expect(typeof brokenPackageExport.initHealthKit).toBe("undefined");
  });

  it("returns unavailable when NativeModules methods are missing", () => {
    expect(
      resolveAppleHealthKit({
        platform: "ios",
        nativeModule: {
          initHealthKit: undefined as unknown as AppleHealthKitNative["initHealthKit"],
          getAnchoredWorkouts: undefined as unknown as AppleHealthKitNative["getAnchoredWorkouts"],
        },
        packageExport: { Constants: constants },
      }),
    ).toBe("unavailable");
  });

  it("returns unavailable when Constants are missing", () => {
    expect(
      resolveAppleHealthKit({
        platform: "ios",
        nativeModule: nativeStub(),
        packageExport: {},
      }),
    ).toBe("unavailable");
  });

  it("reads Constants from default export interop", () => {
    const resolved = resolveAppleHealthKit({
      platform: "ios",
      nativeModule: nativeStub(),
      packageExport: { default: { Constants: constants } },
    });
    expect(resolved).not.toBe("unavailable");
    if (resolved === "unavailable" || resolved === "unsupported") return;
    expect(resolved.Constants.Permissions.Workout).toBe("Workout");
  });
});
