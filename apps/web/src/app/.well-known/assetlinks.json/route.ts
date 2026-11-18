import { serverEnv } from "@/lib/env";

export function GET() {
  const fingerprints = serverEnv.inviteAndroidFingerprints.split(",")
    .map(value => value.trim().toUpperCase())
    .filter(value => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value));
  if (!fingerprints.length) return new Response(null, { status: 404 });

  return Response.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.overtaek.app",
      sha256_cert_fingerprints: fingerprints,
    },
  }]);
}
