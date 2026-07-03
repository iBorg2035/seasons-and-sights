// Regenerates src/data/sight-summary.json — a precomputed {count, types} per
// region id — from src/data/sights.ts. regions-slim.ts needs sightCount/
// sightTypes but must never import sights.ts itself (that's the ~40KB of
// per-destination data the slim bundle exists to avoid), so this snapshot is
// the only way it gets that summary. Run after editing sights.ts:
//
//   node scripts/build-sight-summary.mjs
import { readFileSync, writeFileSync } from "node:fs";

const sightsPath = new URL("../src/data/sights.ts", import.meta.url);
const outPath = new URL("../src/data/sight-summary.json", import.meta.url);

const src = readFileSync(sightsPath, "utf8");
const blockRe = /"([a-z0-9-]+)":\s*\[([\s\S]*?)\n {4}\],/g;

const summary = {};
let match;
while ((match = blockRe.exec(src))) {
  const [, id, body] = match;
  const count = (body.match(/\{ name:/g) ?? []).length;
  const types = [...new Set([...body.matchAll(/type:\s*"([a-z]+)"/g)].map((m) => m[1]))];
  summary[id] = { count, types };
}

writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n");
console.log(`Wrote sight-summary.json for ${Object.keys(summary).length} regions.`);
