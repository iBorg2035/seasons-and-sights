// Refreshes src/data/fx-rates.json — the committed snapshot the app suggests
// exchange rates from (it never fetches a rate at runtime; see src/lib/fx.ts).
// Only currencies already in the file are updated, so adding one stays a
// deliberate edit. Values are rounded to 3 significant figures: they're
// suggestions the traveller confirms, and false precision would imply a feed.
//
//   node scripts/fetch-fx-rates.mjs
//
// Source: open.er-api.com (ExchangeRate-API's free, keyless endpoint), daily
// mid-market rates with USD as the base.
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../src/data/fx-rates.json", import.meta.url);
const file = JSON.parse(readFileSync(path, "utf8"));

const res = await fetch("https://open.er-api.com/v6/latest/USD", {
  headers: { "user-agent": "SeasonsAndSights/1.0 (build script)" },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const body = await res.json();
if (body.result !== "success" || !body.rates) {
  throw new Error(`Unexpected response: ${JSON.stringify(body).slice(0, 200)}`);
}

const round = (v) => Number(v.toPrecision(3));
let changed = 0;
const missing = [];
for (const [code, old] of Object.entries(file.unitsPerUsd)) {
  if (code === "USD") continue;
  const live = body.rates[code];
  if (typeof live !== "number" || !(live > 0)) {
    missing.push(code); // keep the old value rather than drop the currency
    continue;
  }
  const next = round(live);
  if (next !== old) {
    const pct = (((next - old) / old) * 100).toFixed(1);
    console.log(`${code.padEnd(4)} ${String(old).padStart(8)} → ${String(next).padEnd(8)} (${pct}%)`);
    changed++;
  }
  file.unitsPerUsd[code] = next;
}

// The provider's own date for the rates, not the day the script ran.
file.capturedAt = new Date(body.time_last_update_unix * 1000).toISOString().slice(0, 10);
writeFileSync(path, JSON.stringify(file, null, 2) + "\n");

console.log(`\n${changed} rate(s) changed; capturedAt ${file.capturedAt}.`);
if (missing.length) console.warn(`Not in the source, left as they were: ${missing.join(", ")}`);
