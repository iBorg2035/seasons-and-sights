// Validates curated dry/wet seasons against Open-Meteo historical rainfall.
// Flags any month curated "dry" that is actually among the wettest (or "wet"
// that is among the driest). Run:  node scripts/check-seasons.mjs
const REGIONS = [
  ["thailand-chiangmai", 18.7883, 98.9853, "DDDDWWWWWWDD"],
  ["thailand-bangkok", 13.7563, 100.5018, "DDSSWWWWWWDD"],
  ["thailand-krabi", 8.0863, 98.9063, "DDDDWWWWWWSD"],
  ["thailand-kohsamui", 9.512, 100.0136, "SDDDDDDDWWWW"],
  ["indonesia-bali", -8.4095, 115.1889, "WWWSDDDDDSWW"],
  ["vietnam-hoian", 15.8801, 108.338, "WDDDDDDDWWWW"],
  ["vietnam-hanoi", 21.0278, 105.8342, "DSSDWWWWWSDD"],
  ["vietnam-hcmc", 10.8231, 106.6297, "DDDSWWWWWWSD"],
  ["cambodia-siemreap", 13.3671, 103.8448, "DDDDWWWWWWDD"],
  ["philippines-palawan", 11.1949, 119.4013, "DDDDDWWWWWWD"],
  ["peru-cusco", -13.532, -71.9675, "WWWSDDDDDSWW"],
  ["bolivia-uyuni", -20.4597, -66.8253, "WWWSDDDDDDSW"],
  ["patagonia-elcalafate", -50.3379, -72.2648, "DDSSWWWWSSDD"],
  ["brazil-rio", -22.9068, -43.1729, "WWWSSDDDSSWW"],
  ["brazil-amazon-manaus", -3.119, -60.0217, "WWWWWSDDDDSW"],
  ["colombia-cartagena", 10.391, -75.4794, "DDDSWSSWWWWD"],
  ["chile-atacama", -22.9087, -68.1997, "SSDDDDDDDDDD"],
  ["ecuador-galapagos", -0.7437, -90.3136, "SSSSSSSSSSSS"],
  ["albania-riviera", 39.8756, 20.0053, "WWWSSDDDDSWW"],
  ["montenegro-kotor", 42.4247, 18.7712, "WWWSSDDDDSWW"],
  ["sri-lanka-south", 7.2906, 80.6337, "DDDSWWWWWWSD"],
  ["nepal-kathmandu", 27.7172, 85.324, "SSDDSWWWWDDS"],
  ["japan-kyoto", 35.0116, 135.7681, "SSDDDWWWWDDS"],
  ["morocco-marrakech", 31.6295, -7.9811, "SSDDDSSSDDDS"],
  ["tanzania-zanzibar", -6.1659, 39.2026, "DDWWWDDDDDSD"],
  // Newer additions (precip-driven; temperate/comfort-based ones like Paris,
  // Rome, Sydney, Egypt are intentionally omitted — their D/W/S encodes comfort).
  ["costa-rica-arenal", 10.4633, -84.6531, "DDDDWWSWWWWW"],
  ["india-agra", 27.1767, 78.0081, "DDSSSWWWWSDD"],
  ["philippines-manila", 14.5995, 120.9842, "DDDSSWWWWWSD"],
  ["philippines-cebu", 10.3157, 123.8854, "DDDDDWWWWWWD"],
  ["philippines-boracay", 11.9674, 121.9248, "DDDDSWWWWWSS"],
  ["philippines-bohol", 9.85, 124.1435, "DDDDDWWWWWWS"],
  ["philippines-siargao", 9.8482, 126.0458, "WWSDDDDDSSWW"],
  ["philippines-banaue", 16.9114, 121.0586, "DDDDSWWWWWSD"],
  ["philippines-dumaguete", 9.3103, 123.3081, "DDDDDWWWWWSD"],
];
const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function monthlyPrecip(lat, lng) {
  const u = new URL("https://archive-api.open-meteo.com/v1/archive");
  u.searchParams.set("latitude", lat);
  u.searchParams.set("longitude", lng);
  u.searchParams.set("start_date", "2019-01-01");
  u.searchParams.set("end_date", "2023-12-31");
  u.searchParams.set("daily", "precipitation_sum");
  u.searchParams.set("timezone", "auto");
  const d = await (await fetch(u)).json();
  const sum = Array(13).fill(0);
  const years = new Set();
  d.daily.time.forEach((t, i) => {
    const m = Number(t.slice(5, 7));
    years.add(t.slice(0, 4));
    sum[m] += d.daily.precipitation_sum[i] ?? 0;
  });
  const n = years.size || 1;
  return Array.from({ length: 12 }, (_, k) => sum[k + 1] / n);
}

let flags = 0;
for (const [id, lat, lng, pattern] of REGIONS) {
  const precip = await monthlyPrecip(lat, lng);
  const ranked = precip.map((v, i) => i).sort((a, b) => precip[a] - precip[b]); // driest→wettest
  const rank = {}; ranked.forEach((m, r) => (rank[m] = r));
  const issues = [];
  for (let i = 0; i < 12; i++) {
    const s = pattern[i];
    const mm = Math.round(precip[i]);
    if (s === "D" && rank[i] >= 9 && mm > 80) issues.push(`${M[i]} curated DRY but ${mm}mm (top-3 wettest)`);
    if (s === "W" && rank[i] <= 2 && mm < 40) issues.push(`${M[i]} curated WET but ${mm}mm (bottom-3 driest)`);
  }
  if (issues.length) {
    flags += issues.length;
    console.log(`\n⚠ ${id}`);
    issues.forEach((x) => console.log(`   ${x}`));
  } else {
    console.log(`✓ ${id}`);
  }
}
console.log(`\n${flags ? `${flags} potential mismatch(es) to review.` : "All regions consistent with Open-Meteo rainfall."}`);
