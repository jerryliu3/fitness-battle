import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fitness-battle/shared",
    "@fitness-battle/rankings",
    "@fitness-battle/pursuit",
  ],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Supplied GPS fixtures are private development data, never deployment assets.
  outputFileTracingExcludes: { "/*": ["../../.local/**/*"] },
  async redirects() {
    return [
      { source: "/compete", destination: "/app/arena", permanent: true },
      {
        source: "/signin",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
