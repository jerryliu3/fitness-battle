import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
const eas = JSON.parse(readFileSync(join(root, "eas.json"), "utf8"));

describe("store binary config", () => {
  it("keeps the iOS binary phone-only, exempt from extra encryption review, and explicit about health and photos", () => {
    expect(app.ios.supportsTablet).toBe(false);
    expect(app.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(app.ios.infoPlist.NSHealthShareUsageDescription).toMatch(/workouts/);
    expect(app.ios.infoPlist.NSHealthUpdateUsageDescription).toMatch(/does not write/);
    expect(app.ios.infoPlist.NSPhotoLibraryUsageDescription).toMatch(/photo/);
    expect(app.ios.infoPlist.NSLocationWhenInUseUsageDescription).toBeUndefined();
    expect(app.ios.infoPlist.NSCameraUsageDescription).toBeUndefined();
    expect(app.ios.infoPlist.NSMotionUsageDescription).toBeUndefined();
  });

  it("declares the required-reason APIs used by Expo and React Native", () => {
    expect(app.ios.privacyManifests.NSPrivacyTracking).toBe(false);
    const reasons = Object.fromEntries(
      app.ios.privacyManifests.NSPrivacyAccessedAPITypes.map(
        (entry: { NSPrivacyAccessedAPIType: string; NSPrivacyAccessedAPITypeReasons: string[] }) => [
          entry.NSPrivacyAccessedAPIType,
          entry.NSPrivacyAccessedAPITypeReasons,
        ],
      ),
    );
    expect(reasons.NSPrivacyAccessedAPICategoryUserDefaults).toEqual(["CA92.1"]);
    expect(reasons.NSPrivacyAccessedAPICategoryFileTimestamp).toEqual(["C617.1", "0A2A.1", "3B52.1"]);
    expect(reasons.NSPrivacyAccessedAPICategorySystemBootTime).toEqual(["35F9.1"]);
    expect(reasons.NSPrivacyAccessedAPICategoryDiskSpace).toEqual(["E174.1", "85F4.1"]);
  });

  it("targets Android 16 and keeps native libraries on 16 KB page alignment", () => {
    const plugin = app.plugins.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === "expo-build-properties",
    );
    expect(plugin?.[1].android).toMatchObject({
      targetSdkVersion: 36,
      compileSdkVersion: 37,
      useLegacyPackaging: false,
    });
    expect(plugin?.[1].ios.privacyManifestAggregationEnabled).toBe(true);
  });

  it("requests only the Health Connect reads the app performs", () => {
    expect(app.android.permissions).toEqual([
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.health.READ_EXERCISE",
      "android.permission.health.READ_DISTANCE",
    ]);
    for (const blocked of [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.ACTIVITY_RECOGNITION",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.health.READ_HEART_RATE",
      "android.permission.health.READ_SLEEP",
      "android.permission.health.WRITE_EXERCISE",
    ]) {
      expect(app.android.blockedPermissions).toContain(blocked);
    }
  });

  it("ships a flattened 1024 app icon and a 512 Play listing icon", () => {
    const icon = readFileSync(join(root, "assets/icon.png"));
    const play = readFileSync(join(root, "../../docs/store/play-icon-512.png"));
    expect(icon.readUInt32BE(16)).toBe(1024);
    expect(icon.readUInt32BE(20)).toBe(1024);
    expect(icon[25]).toBe(2);
    expect(play.readUInt32BE(16)).toBe(512);
    expect(play.readUInt32BE(20)).toBe(512);
    expect(play[25]).toBe(6);
    expect(play.length).toBeLessThan(1024 * 1024);
  });

  it("builds store binaries on the SDK 58 image and ships an Android app bundle", () => {
    for (const profile of ["development", "preview", "production"] as const) {
      expect(eas.build[profile].ios.image).toBe("sdk-58");
      expect(eas.build[profile].android.image).toBe("sdk-58");
    }
    expect(eas.build.production.android.buildType).toBe("app-bundle");
  });
});
