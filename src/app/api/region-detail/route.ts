import { NextResponse } from "next/server";
import { REGIONS_CORE } from "@/data/regions-core";
import { SIGHTS } from "@/data/sights";
import { EVENTS } from "@/data/events";
import { TOOLKITS } from "@/data/toolkits";
import { advisoryFor } from "@/data/advisories";

export const revalidate = 86400; // curated/static data — cache 1 day

/**
 * Server-only destination detail (sights, toolkit, events, advisory) for one
 * region, fetched lazily by the trip page when a stop is expanded. This is
 * the sanctioned way for client views to reach the heavy data modules —
 * importing them directly from a "use client" file is forbidden (CLAUDE.md).
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const region = REGIONS_CORE.find((r) => r.id === id);
  if (!region) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    {
      sights: SIGHTS[id] ?? [],
      events: EVENTS[id] ?? [],
      toolkit:
        TOOLKITS[id] ?? { phrases: [], emergency: "", tipping: "", water: "" },
      advisory: advisoryFor(region.country),
    },
    {
      headers: {
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
