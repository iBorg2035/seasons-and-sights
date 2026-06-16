import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seasons & Sights",
    short_name: "Seasons&Sights",
    description:
      "Travel in the right season — dry/wet seasons, crowds, sights, and a trip planner.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#f97316",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
