import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.TRIPADVISOR_API_KEY;
const BASE = "https://api.content.tripadvisor.com/api/v1";

// In-memory cache (per-instance, cleared on redeploy). Keeps us well under the
// 5k/month free-tier limit for repeat visits to the same destination.
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 86400_000; // 24h

async function cachedFetch(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

/**
 * GET /api/tripadvisor?q=<destination name>
 *
 * Searches for a location, then returns its rating, review count, and web URL.
 * Server-side only — the API key never reaches the client.
 */
export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= param" }, { status: 400 });
  }

  // Step 1: search for the location
  const searchUrl = `${BASE}/location/search?key=${KEY}&searchQuery=${encodeURIComponent(q)}&language=en`;
  const searchData = (await cachedFetch(searchUrl)) as {
    data?: { location_id: string }[];
  } | null;
  const locationId = searchData?.data?.[0]?.location_id;
  if (!locationId) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  // Step 2: get details (rating, review count, web URL)
  const detailUrl = `${BASE}/location/${locationId}/details?key=${KEY}&language=en`;
  const detail = (await cachedFetch(detailUrl)) as {
    name?: string;
    rating?: string;
    num_reviews?: string;
    web_url?: string;
    ranking_data?: { ranking_string?: string };
  } | null;

  if (!detail) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      found: true,
      name: detail.name,
      rating: detail.rating ? parseFloat(detail.rating) : null,
      reviewCount: detail.num_reviews
        ? parseInt(detail.num_reviews, 10)
        : null,
      webUrl: detail.web_url ?? null,
      ranking: detail.ranking_data?.ranking_string ?? null,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    }
  );
}
