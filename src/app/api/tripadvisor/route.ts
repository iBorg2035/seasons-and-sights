import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

const BASE = "https://api.content.tripadvisor.com/api/v1";

// In-memory cache (per-instance, cleared on redeploy) of the final answer per
// query. Keeps us well under the 5k/month free-tier limit for repeat visits to
// the same destination.
type Answer = Record<string, unknown> & { found: boolean };
const cache = new Map<string, { answer: Answer; ts: number }>();
const TTL = 86400_000; // 24h

/**
 * Every distinct query is a new entry, and the query is caller-chosen, so the
 * map must be bounded or a loop over random ?q= values grows it for the life
 * of the instance. Expired entries go first; past the hard cap the oldest
 * (Map preserves insertion order) are evicted.
 */
const MAX_ENTRIES = 1000;
function pruneCache(now: number) {
  if (cache.size < 500) return;
  for (const [key, entry] of cache) {
    if (now - entry.ts >= TTL) cache.delete(key);
  }
  for (const key of cache.keys()) {
    if (cache.size < MAX_ENTRIES) break;
    cache.delete(key);
  }
}

// Each miss costs 1–2 upstream calls. A destination page asks once, so this
// only bites a client looping over queries.
const rateLimit = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * GET /api/tripadvisor?q=<destination name>
 *
 * Searches for a location, then returns its rating, review count, and web URL.
 * Server-side only — the API key never reaches the client.
 */
export async function GET(req: Request) {
  const KEY = process.env.TRIPADVISOR_API_KEY;
  if (!KEY) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const q = new URL(req.url).searchParams
    .get("q")
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= param" }, { status: 400 });
  }
  // "Hoi An", "hoi  an" and "HOI AN" are one lookup, not three.
  const key = q.toLowerCase();

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) return respond(hit.answer);

  // Only rate-limit calls that would actually spend, same as /api/places.
  const limit = rateLimit(clientKey(req), now);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many rating lookups — give it a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  // Step 1: search for the location
  const searchUrl = `${BASE}/location/search?key=${KEY}&searchQuery=${encodeURIComponent(q)}&language=en`;
  const searchData = (await fetchJson(searchUrl)) as {
    data?: { location_id: string }[];
  } | null;
  // An upstream failure isn't cached — it says nothing about the destination.
  if (!searchData) return respond({ found: false });
  const locationId = searchData.data?.[0]?.location_id;
  if (!locationId) return remember(key, now, { found: false });

  // Step 2: get details (rating, review count, web URL)
  const detailUrl = `${BASE}/location/${locationId}/details?key=${KEY}&language=en`;
  const detail = (await fetchJson(detailUrl)) as {
    name?: string;
    rating?: string;
    num_reviews?: string;
    web_url?: string;
    ranking_data?: { ranking_string?: string };
  } | null;

  if (!detail) return respond({ found: false });

  return remember(key, now, {
    found: true,
    name: detail.name,
    rating: detail.rating ? parseFloat(detail.rating) : null,
    reviewCount: detail.num_reviews ? parseInt(detail.num_reviews, 10) : null,
    webUrl: detail.web_url ?? null,
    ranking: detail.ranking_data?.ranking_string ?? null,
  });
}

function remember(key: string, now: number, answer: Answer) {
  pruneCache(now);
  cache.set(key, { answer, ts: now });
  return respond(answer);
}

function respond(answer: Answer) {
  return NextResponse.json(answer, {
    status: 200,
    headers: answer.found
      ? { "Cache-Control": "public, max-age=86400, s-maxage=86400" }
      : undefined,
  });
}
