import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";

// Cache responses for an hour; live weather is an enhancement, not core data.
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (
    latParam === null ||
    lngParam === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      {
        error:
          "valid lat (-90..90) and lng (-180..180) query params are required",
      },
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
