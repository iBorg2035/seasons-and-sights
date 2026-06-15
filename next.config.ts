import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the tracing root to this project; several lockfiles exist higher up.
  outputFileTracingRoot: path.resolve(),
};

export default nextConfig;
