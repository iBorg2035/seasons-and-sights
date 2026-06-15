import type { Region } from "@/types";
import { buildBookingUrl } from "@/lib/booking";
import { MONTH_NAMES_LONG } from "@/lib/season";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTH_NAMES_LONG[m - 1]} ${d}, ${y}`;
}

export function BookingCard({
  region,
  checkin,
  checkout,
  monthLabel,
}: {
  region: Region;
  checkin: string;
  checkout: string;
  /** e.g. "June" or "Cusco's best season" — describes why these dates. */
  monthLabel: string;
}) {
  const url = buildBookingUrl({
    dest: region.bookingDest,
    checkin,
    checkout,
    lat: region.lat,
    lng: region.lng,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">Stay here</h3>
      <p className="mt-1 text-sm text-slate-500">Dates set for {monthLabel}:</p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">
        {prettyDate(checkin)} → {prettyDate(checkout)} · 2 guests
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003580] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00224f]"
      >
        Search stays on Booking.com
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
