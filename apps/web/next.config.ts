import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fitness-battle/shared",
    "@fitness-battle/rankings",
    "@fitness-battle/pursuit",
  ],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
