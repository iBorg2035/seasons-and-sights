import { flightHop } from "@/lib/transport";

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
  from?: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
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
  return (
    <p className="text-sm text-slate-600">
      <span className="font-medium text-slate-700">
        {mode} ~{hop.hours}h {modeLabel}
      </span>{" "}
      from {from.name} · ~${hop.usd}
    </p>
  );
}
