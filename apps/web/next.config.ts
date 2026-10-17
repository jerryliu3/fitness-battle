import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fitness-battle/shared",
    "@fitness-battle/rankings",
    "@fitness-battle/pursuit",
  ],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async redirects() {
    return [
      {
        source: "/signin",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
