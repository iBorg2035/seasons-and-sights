import type { TravelToolkit } from "@/types";

/**
 * "Arrive prepared" card: SIM/eSIM hint, plug type, essential phrases,
 * tipping, tap water. Surfaces toolkit data + the plug note prominently.
 * Type-only import — no runtime data module reaches the client bundle.
 */
export function ArrivePrepared({
  toolkit,
  plug,
}: {
  toolkit: TravelToolkit;
  plug?: string;
}) {
  const phrases = toolkit.phrases.slice(0, 4);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {plug && <span>🔌 {plug}</span>}
        <span>📶 eSIM or local SIM for data</span>
      </div>
      {phrases.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {phrases.map((p) => (
            <div key={p.en} className="flex gap-2">
              <dt className="text-slate-400">{p.en}:</dt>
              <dd className="font-medium">{p.local}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 text-xs text-slate-500">
        🚨 Emergency {toolkit.emergency} · 💵 {toolkit.tipping} · 💧{" "}
        {toolkit.water}
      </p>
    </div>
  );
}
