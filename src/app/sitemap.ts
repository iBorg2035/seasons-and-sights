import type { MetadataRoute } from "next";
import { REGIONS } from "@/data/regions";

const SITE = "https://seasons-and-sights.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // /planner and /today are legacy client-side redirects into /trips, and
  // /trips/[id] pages are private — none of those belong in the sitemap.
  const pages = [
    "",
    "/when-to-go",
    "/trips",
    "/compare",
    "/festivals",
    "/surprise",
    "/calendar",
    "/about",
    "/privacy",
    "/terms",
    "/where-can-i-go",
  ].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  const regions = REGIONS.map((r) => ({
    url: `${SITE}/regions/${r.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...pages, ...regions];
}
