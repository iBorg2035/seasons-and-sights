import { NextResponse } from "next/server";

// Photos are stable; cache for 30 days.
export const revalidate = 2592000;

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title");
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        next: { revalidate: 2592000 },
        headers: {
          accept: "application/json",
          // Wikimedia requires a descriptive User-Agent.
          "user-agent": "SeasonsAndSights/1.0 (travel season planner)",
        },
      }
    );
    if (!res.ok) return NextResponse.json({ thumb: null, full: null });
    const d = await res.json();
    return NextResponse.json({
      thumb: d.thumbnail?.source ?? null,
      full: d.originalimage?.source ?? d.thumbnail?.source ?? null,
      page: d.content_urls?.desktop?.page ?? null,
    });
  } catch {
    return NextResponse.json({ thumb: null, full: null });
  }
}
