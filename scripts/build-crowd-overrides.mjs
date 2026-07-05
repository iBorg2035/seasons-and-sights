// Regenerates src/data/crowd-overrides.json — the set of festival months per
// region id, derived from src/data/events.ts. regions-core.ts consumes this
// to mark those months "high" crowd (unless a region already has a manual
// override), without ever importing events.ts itself (that's heavy,
// server-only data the client-safe regions-slim.ts must not pull in). Run
// after editing events.ts:
//
//   node scripts/build-crowd-overrides.mjs
import { readFileSync, writeFileSync } from "node:fs";

const eventsPath = new URL("../src/data/events.ts", import.meta.url);
const outPath = new URL("../src/data/crowd-overrides.json", import.meta.url);

const src = readFileSync(eventsPath, "utf8");
const blockRe = /"([a-z0-9-]+)":\s*\[([\s\S]*?)\n {4}\],/g;

const overrides = {};
let match;
while ((match = blockRe.exec(src))) {
  const [, id, body] = match;
  const months = [
    ...new Set([...body.matchAll(/month:\s*(\d{1,2})/g)].map((m) => Number(m[1]))),
  ].sort((a, b) => a - b);
  if (months.length) overrides[id] = months;
}

writeFileSync(outPath, JSON.stringify(overrides, null, 2) + "\n");
console.log(`Wrote crowd-overrides.json for ${Object.keys(overrides).length} regions.`);
