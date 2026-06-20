// Downloads every remote photo referenced in src/data/photos.json into
// public/photos/, then rewrites photos.json to point at the local copies. This
// removes the runtime dependency on upload.wikimedia.org (no 429s, faster LCP,
// served from our own CDN). Re-run after fetch-photos.mjs adds new URLs.
//   node scripts/download-photos.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const photosPath = new URL("../src/data/photos.json", import.meta.url);
const outDir = new URL("../public/photos/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const photos = JSON.parse(readFileSync(photosPath, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let downloaded = 0;
for (const [id, url] of Object.entries(photos)) {
  if (url.startsWith("/")) continue; // already local
  const ext = (url.split("?")[0].split(".").pop() || "jpg").toLowerCase();
  const file = `${id}.${ext}`;
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "SeasonsAndSights/1.0 (build script)" },
      });
      if (res.status === 429) { await sleep(3000 * attempt); continue; }
      if (!res.ok) { console.warn(`✗ ${id}: HTTP ${res.status}`); break; }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(new URL(file, outDir), buf);
      photos[id] = `/photos/${file}`;
      console.log(`✓ ${id}  (${(buf.length / 1024).toFixed(0)} KB)`);
      downloaded++;
      ok = true;
    } catch (e) {
      console.warn(`✗ ${id}: ${e.message}`);
      break;
    }
  }
  await sleep(800);
}

writeFileSync(photosPath, JSON.stringify(photos, null, 2) + "\n");
console.log(`\nDownloaded ${downloaded}; photos.json now points at local files.`);
