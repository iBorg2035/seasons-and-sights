// Fetches a representative Wikipedia photo per destination and writes width-1280
// thumbnail URLs to src/data/photos.json, so the app needs no runtime image
// lookups. Titles come from src/data/wiki-titles.json (single source of truth).
//
//   node scripts/fetch-photos.mjs            # fetch only missing photos (merge)
//   node scripts/fetch-photos.mjs --all      # refetch everything
//
// Merges by default and backs off on HTTP 429, so a rate-limit can't wipe the
// existing file.
import { readFileSync, writeFileSync } from "node:fs";

const refetchAll = process.argv.includes("--all");
const titlesPath = new URL("../src/data/wiki-titles.json", import.meta.url);
const photosPath = new URL("../src/data/photos.json", import.meta.url);

const TITLES = JSON.parse(readFileSync(titlesPath, "utf8"));
const out = JSON.parse(readFileSync(photosPath, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fetched = 0;
for (const [id, title] of Object.entries(TITLES)) {
  if (!refetchAll && out[id]) continue; // keep existing unless --all
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { accept: "application/json", "user-agent": "SeasonsAndSights/1.0 (build script)" } }
      );
      if (res.status === 429) { await sleep(3000 * attempt); continue; }
      if (!res.ok) { console.warn(`✗ ${id}: HTTP ${res.status}`); break; }
      const thumb = (await res.json()).thumbnail?.source;
      if (!thumb) { console.warn(`✗ ${id}: no thumbnail`); break; }
      out[id] = thumb.replace(/\/(\d+)px-/, "/1280px-");
      console.log(`✓ ${id}`);
      fetched++;
      ok = true;
    } catch (e) {
      console.warn(`✗ ${id}: ${e.message}`);
      break;
    }
  }
  await sleep(1200); // be gentle on the API
}

writeFileSync(photosPath, JSON.stringify(out, null, 2) + "\n");
console.log(`\nFetched ${fetched}; ${Object.keys(out).length} photos total in src/data/photos.json`);
