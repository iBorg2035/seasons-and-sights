import type { NextConfig } from "next";
import path from "node:path";

/**
 * Identifies this build to the service worker, which uses it as its cache name.
 * The commit sha on Vercel; a build timestamp anywhere else, so a self-hosted
 * or local production build still gets a fresh cache per build rather than
 * silently sharing one. Evaluated when next.config is loaded — at build time,
 * not per request — so every client of one deployment agrees on the value.
 */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  // Pin the tracing root to this project; several lockfiles exist higher up.
  outputFileTracingRoot: path.resolve(),
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
