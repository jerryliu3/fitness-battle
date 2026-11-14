import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { mobileEnv } from "../../lib/env";

export type VitalsLabHostSource = {
  mode: "bundled" | "remote";
  uri: string;
  /** file: read-access root for iOS sibling assets (meshes). */
  readAccessUrl?: string;
  /** POST to bridge: "" when meshes are bundled next to index.html. */
  assetBaseUrl: string;
  allowsRequest: (url: string) => boolean;
};

let cached: Promise<VitalsLabHostSource> | null = null;

function remoteSource(): VitalsLabHostSource {
  const base = mobileEnv.apiUrl.replace(/\/$/, "");
  const uri = `${base}/vitals-lab-canvas`;
  const origin = new URL(uri).origin;
  return {
    mode: "remote",
    uri,
    assetBaseUrl: base,
    allowsRequest: (url) =>
      url === "about:blank" || url.startsWith(`${origin}/vitals-lab-canvas`),
  };
}

export function resolveVitalsLabHostSource(): Promise<VitalsLabHostSource> {
  if (cached) return cached;
  cached = (async () => {
    if (Platform.OS === "web") return remoteSource();

    try {
      const bundled = [
        require("../../../assets/vitals-lab-host/index.html"),
        require("../../../assets/vitals-lab-host/bundle.js"),
        require("../../../assets/vitals-lab-host/bundle.css"),
        require("../../../assets/vitals-lab-host/bodies/anny/meshes/female.glb"),
        require("../../../assets/vitals-lab-host/bodies/anny/meshes/male.glb"),
      ];
      const assets = await Promise.all(
        bundled.map((mod) => Asset.fromModule(mod).downloadAsync()),
      );
      const html = assets[0]!;
      const localUri = html.localUri;
      if (!localUri) throw new Error("bundled vitals host missing");
      const root = `${localUri.replace(/\/[^/]+$/, "/")}`;
      return {
        mode: "bundled",
        uri: localUri,
        readAccessUrl: root,
        assetBaseUrl: "",
        allowsRequest: (url) =>
          url === "about:blank" ||
          url.startsWith(root) ||
          url.startsWith("file://"),
      };
    } catch {
      return remoteSource();
    }
  })();
  return cached;
}
