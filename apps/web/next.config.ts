import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fitness-battle/shared",
    "@fitness-battle/rankings",
    "@fitness-battle/pursuit",
  ],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Supplied GPS fixtures are private development data, never deployment assets.
  outputFileTracingExcludes: { "/*": ["../../.local/**/*"] },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/app/rankings/:path*", destination: "/app/pace/:path*", permanent: true },
      { source: "/rankings/:path*", destination: "/app/pace/:path*", permanent: true },
      { source: "/compete", destination: "/app/arena", permanent: true },
      {
        source: "/signin",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/account/delete",
        destination: "/support#delete-account",
        permanent: false,
      },
      { source: "/ux/vital-lab", destination: "/ux/vitals-lab", permanent: false },
      { source: "/vitals-lab-embed", destination: "/ux/vitals-lab-embed", permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "overtaek",
  project: process.env.SENTRY_PROJECT ?? "overtaek-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
