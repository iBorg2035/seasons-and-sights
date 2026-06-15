import { NextResponse } from "next/server";
import { fetchClimateNormals } from "@/lib/weather";

// Historical normals are static; cache aggressively.
export const revalidate = 2592000; // 30 days

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  try {
    const normals = await fetchClimateNormals(lat, lng);
    return NextResponse.json({ normals });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "climate fetch failed" },
      { status: 502 }
    );
  }
}
