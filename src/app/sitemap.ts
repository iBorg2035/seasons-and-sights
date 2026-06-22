import type { MetadataRoute } from "next";
import { REGIONS } from "@/data/regions";

const SITE = "https://seasons-and-sights.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/when-to-go",
    "/planner",
    "/compare",
    "/festivals",
    "/surprise",
    "/today",
    "/about",
    "/privacy",
    "/terms",
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
