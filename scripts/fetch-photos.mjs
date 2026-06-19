// One-off generator: fetches a representative Wikipedia photo per destination
// and writes width-1280 thumbnail URLs to src/data/photos.json, so the app
// needs no runtime image lookups. Re-run if you change wikiTitles.
//   node scripts/fetch-photos.mjs
import { writeFileSync } from "node:fs";

const TITLES = {
  "thailand-chiangmai": "Chiang Mai",
  "thailand-bangkok": "Bangkok",
  "thailand-krabi": "Railay Beach",
  "thailand-kohsamui": "Ko Samui",
  "indonesia-bali": "Bali",
  "vietnam-hoian": "Da Nang",
  "vietnam-hanoi": "Hanoi",
  "vietnam-hcmc": "Ho Chi Minh City",
  "cambodia-siemreap": "Angkor Wat",
  "philippines-palawan": "El Nido, Palawan",
  "peru-cusco": "Machu Picchu",
  "bolivia-uyuni": "Salar de Uyuni",
  "patagonia-elcalafate": "Perito Moreno Glacier",
  "brazil-rio": "Rio de Janeiro",
  "brazil-amazon-manaus": "Amazon rainforest",
  "colombia-cartagena": "Cartagena, Colombia",
  "chile-atacama": "Atacama Desert",
  "ecuador-galapagos": "Galápagos Islands",
  "albania-riviera": "Albanian Riviera",
  "montenegro-kotor": "Kotor",
  "sri-lanka-south": "Sigiriya",
  "nepal-kathmandu": "Boudhanath",
  "japan-kyoto": "Fushimi Inari-taisha",
  "morocco-marrakech": "Marrakesh",
  "tanzania-zanzibar": "Zanzibar",
  "mexico-yucatan": "Tulum",
  "india-rajasthan": "Hawa Mahal",
  "turkey-cappadocia": "Cappadocia",
  "greece-santorini": "Santorini",
  "south-africa-capetown": "Cape Town",
  "japan-tokyo": "Tokyo",
  "japan-hokkaido": "Sapporo",
  "japan-okinawa": "Shuri Castle",
  "costa-rica-arenal": "Arenal Volcano",
  "egypt-cairo": "Giza pyramid complex",
  "india-agra": "Taj Mahal",
  "france-paris": "Eiffel Tower",
  "italy-rome": "Colosseum",
  "australia-sydney": "Sydney Opera House",
  "newzealand-queenstown": "Queenstown, New Zealand",
  "philippines-manila": "Intramuros",
  "philippines-cebu": "Kawasan Falls",
  "philippines-boracay": "Boracay",
  "philippines-bohol": "Chocolate Hills",
  "philippines-siargao": "Siargao",
  "philippines-banaue": "Banaue Rice Terraces",
};

const out = {};
for (const [id, title] of Object.entries(TITLES)) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { accept: "application/json", "user-agent": "SeasonsAndSights/1.0 (build script)" } }
    );
    if (!res.ok) {
      console.warn(`✗ ${id}: HTTP ${res.status}`);
      continue;
    }
    const d = await res.json();
    const thumb = d.thumbnail?.source;
    if (!thumb) {
      console.warn(`✗ ${id}: no thumbnail`);
      continue;
    }
    // Bump the thumbnail to 1280px wide; next/image downsizes from there.
    out[id] = thumb.replace(/\/(\d+)px-/, "/1280px-");
    console.log(`✓ ${id}`);
  } catch (e) {
    console.warn(`✗ ${id}: ${e.message}`);
  }
}

writeFileSync(
  new URL("../src/data/photos.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n"
);
console.log(`\nWrote ${Object.keys(out).length} photos to src/data/photos.json`);
