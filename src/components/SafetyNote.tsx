// Dot map inlined (not imported from @/data/advisories) so this stays out of
// the client bundle's data graph — the advisory itself arrives as a prop,
// fetched from /api/region-detail by the client.
const DOTS = { low: "🟢", moderate: "🟡", high: "🔴" } as const;

/** A one-line safety advisory chip. Purely presentational; takes the data. */
export function SafetyNote({
  advisory,
}: {
  advisory: { level: "low" | "moderate" | "high"; text: string };
}) {
  return (
    <p className="text-sm text-slate-600">
      <span className="mr-1.5" aria-hidden>
        {DOTS[advisory.level]}
      </span>
      <span className="font-medium text-slate-700">Safety:</span>{" "}
      {advisory.text}
    </p>
  );
}
