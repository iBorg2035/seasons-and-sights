import { flightHop } from "@/lib/transport";
import { buildFlightsUrl, buildRome2RioUrl } from "@/lib/booking";

/**
 * Transport line for reaching this stop from the previous one (or from home
 * for the first stop). Uses flightHop for leg-to-leg estimates.
 */
export function GettingThere({
  from,
  to,
  note,
  isFirst,
  regionName,
}: {
  from?: { lat: number; lng: number; name: string; dest?: string };
  to: { lat: number; lng: number; name: string; dest?: string };
  note?: string;
  isFirst: boolean;
  regionName: string;
}) {
  const flightsUrl = buildFlightsUrl(to.dest ?? to.name);

  if (isFirst) {
    return (
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-700">Getting there:</span>{" "}
        {note ?? `Fly into ${regionName}.`}{" "}
        <a
          href={flightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-700 hover:underline"
        >
          Search flights ↗
        </a>
      </p>
    );
  }
  if (!from) return null;
  const hop = flightHop(from, to);
  const mode = hop.overland ? "🚌" : "✈️";
  const modeLabel = hop.overland ? "overland" : "flight";
  const compareUrl = buildRome2RioUrl(from.dest ?? from.name, to.dest ?? to.name);
  return (
    <p className="text-sm text-slate-600">
      <span className="font-medium text-slate-700">
        {mode} ~{hop.hours}h {modeLabel}
      </span>{" "}
      from {from.name} · ~${hop.usd}
      {" · "}
      <a
        href={compareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-teal-700 hover:underline"
      >
        Compare routes ↗
      </a>
      {/* Only when it's actually a flight — offering a flight search for a
          four-hour bus hop is noise. */}
      {!hop.overland && (
        <>
          {" · "}
          <a
            href={flightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-700 hover:underline"
          >
            Flights ↗
          </a>
        </>
      )}
    </p>
  );
}
