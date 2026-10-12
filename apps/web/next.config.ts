import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@fitness-battle/shared", "@fitness-battle/rankings"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
