import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";

// Cache responses for an hour; live weather is an enhancement, not core data.
export const revalidate = 3600;

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
    const weather = await fetchWeather(lat, lng);
    return NextResponse.json(weather);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "weather fetch failed" },
      { status: 502 }
    );
  }
}
