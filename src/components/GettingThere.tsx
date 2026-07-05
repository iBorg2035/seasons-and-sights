import { flightHop } from "@/lib/transport";
import { buildRome2RioUrl } from "@/lib/booking";

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
  if (isFirst) {
    return (
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-700">Getting there:</span>{" "}
        {note ? note : `Fly into ${regionName} — search flights for your dates.`}
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
    </p>
  );
}
