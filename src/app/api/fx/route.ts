import { NextResponse } from "next/server";

// Rates change slowly; cache for 12 hours.
export const revalidate = 43200;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 43200 },
    });
    if (!res.ok) return NextResponse.json({ rates: null }, { status: 502 });
    const d = await res.json();
    return NextResponse.json({ rates: d.rates ?? null });
  } catch {
    return NextResponse.json({ rates: null }, { status: 502 });
  }
}
