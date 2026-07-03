import type {
  CrowdLevel,
  MonthClimate,
  MonthlyClimate,
  Region,
  Season,
  TravelInfo,
} from "@/types";
import photos from "@/data/photos.json";
import wikiTitles from "@/data/wiki-titles.json";

const SEASON_BY_CHAR: Record<string, Season> = {
  D: "dry",
  W: "wet",
  S: "shoulder",
};

/**
 * Compact 12-char climate pattern (Jan→Dec): D=dry, W=wet, S=shoulder.
 * `notes` and `crowds` are keyed by 1-based month number; `crowds` overrides the
 * crowd level only where it diverges from the weather (e.g. Carnival, holidays).
 */
function climate(
  pattern: string,
  notes: Record<number, string> = {},
  crowds: Record<number, CrowdLevel> = {}
): MonthlyClimate {
  const months: MonthlyClimate = {};
  for (let i = 0; i < 12; i++) {
    const m = i + 1;
    const entry: MonthClimate = { season: SEASON_BY_CHAR[pattern[i]] };
    if (notes[m]) entry.note = notes[m];
    if (crowds[m]) entry.crowd = crowds[m];
    months[m] = entry;
  }
  return months;
}

/**
 * The lightweight per-region fields — everything except `sights`, `toolkit`,
 * and `events` (the heavy, region-detail-only data in sights.ts/toolkits.ts/
 * events.ts). This is the shared base for both the full dataset
 * (src/data/regions.ts) and the client-facing slim dataset
 * (src/data/regions-slim.ts): each `sights` placeholder below is replaced with
 * real data (or left empty) by whichever of those two assembles it further.
 */
export const REGIONS_CORE: Region[] = [
  // ───────────────────────── Southeast Asia ─────────────────────────
  {
    id: "thailand-chiangmai",
    name: "Chiang Mai",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 18.7883,
    lng: 98.9853,
    bookingDest: "Chiang Mai, Thailand",
    climateBlurb:
      "Cool, dry air from November to February; a hot, hazy March–April; then the southwest monsoon brings afternoon rains May–October.",
    months: climate("DDDDWWWWWWDD", {
      3: "crop-burning season — hazy skies",
      4: "hottest month, burning-season haze",
      9: "wettest month",
    }),
    sights: [],
  },
  {
    id: "thailand-bangkok",
    name: "Bangkok",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 13.7563,
    lng: 100.5018,
    bookingDest: "Bangkok, Thailand",
    climateBlurb:
      "Driest and most comfortable November–February, blistering hot March–May, then monsoon downpours peaking September–October.",
    months: climate("DDSSWWWWWWDD", {
      4: "peak heat and humidity",
      9: "wettest month",
      10: "heavy rain, occasional flooding",
    }),
    sights: [],
  },
  {
    id: "thailand-krabi",
    name: "Krabi & Railay",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 8.0863,
    lng: 98.9063,
    bookingDest: "Krabi, Thailand",
    climateBlurb:
      "Andaman-coast beaches: dry, calm, clear seas November–April; the southwest monsoon brings rain and swell May–October.",
    months: climate("DDDDWWWWWWSD", {
      2: "driest, clearest water",
      9: "wettest month",
      10: "rough seas, boat trips may pause",
      11: "monsoon easing, fewer crowds",
    }),
    sights: [],
  },
  {
    id: "thailand-kohsamui",
    name: "Koh Samui",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 9.512,
    lng: 100.0136,
    bookingDest: "Koh Samui, Thailand",
    climateBlurb:
      "Gulf coast — the mirror image of the Andaman side: driest February–August, wettest October–December under the northeast monsoon.",
    months: climate("SDDDDDDDWWWW", {
      3: "driest, sunniest",
      11: "wettest (northeast monsoon)",
      12: "heavy rain continues",
    }),
    sights: [],
  },
  {
    id: "indonesia-bali",
    name: "Bali",
    country: "Indonesia",
    continent: "Southeast Asia",
    lat: -8.4095,
    lng: 115.1889,
    bookingDest: "Bali, Indonesia",
    climateBlurb:
      "Dry season April–October (peak July–August), wet season November–March with short, intense afternoon downpours.",
    months: climate("WWWSDDDDDSWW", {
      1: "wettest month",
      7: "peak season — busiest and most expensive",
      8: "peak season — book ahead",
    }),
    sights: [],
  },
  {
    id: "vietnam-hoian",
    name: "Hoi An & Da Nang",
    country: "Vietnam",
    continent: "Southeast Asia",
    lat: 15.8801,
    lng: 108.338,
    bookingDest: "Hoi An, Vietnam",
    climateBlurb:
      "Central Vietnam runs opposite the rest of the country: dry and sunny February–August, then a sharp wet season September–December with flood and typhoon risk.",
    months: climate("WDDDDDDDWWWW", {
      2: "dry, sunny season begins",
      6: "hottest month",
      10: "flooding and typhoon risk",
      11: "flooding and typhoon risk",
    }),
    sights: [],
  },
  {
    id: "vietnam-hanoi",
    name: "Hanoi & the North",
    country: "Vietnam",
    continent: "Southeast Asia",
    lat: 21.0278,
    lng: 105.8342,
    bookingDest: "Hanoi, Vietnam",
    climateBlurb:
      "Northern Vietnam has a cool, mostly dry winter (Oct–Apr, with a misty drizzle in Feb–Mar) and a hot, wet summer May–Sep. October–November and April are the sweet spots.",
    months: climate("DSSDWWWWWSDD", {
      2: "cool drizzle (crachin)",
      3: "cool drizzle (crachin)",
      7: "hot and wettest",
      8: "hot and wettest",
      10: "cooler; late rains easing",
      11: "ideal — cool and dry",
    }),
    sights: [],
  },
  {
    id: "vietnam-hcmc",
    name: "Ho Chi Minh City & Mekong",
    country: "Vietnam",
    continent: "Southeast Asia",
    lat: 10.8231,
    lng: 106.6297,
    bookingDest: "Ho Chi Minh City, Vietnam",
    climateBlurb:
      "The tropical south is straightforward: dry December–April (hottest in April) and a wet southwest monsoon May–November with short, heavy afternoon downpours.",
    months: climate("DDDSWWWWWWSD", {
      4: "hottest month",
      9: "wettest",
      10: "wettest",
    }),
    sights: [],
  },
  {
    id: "cambodia-siemreap",
    name: "Siem Reap & Angkor",
    country: "Cambodia",
    continent: "Southeast Asia",
    lat: 13.3671,
    lng: 103.8448,
    bookingDest: "Siem Reap, Cambodia",
    climateBlurb:
      "Dry season November–April (very hot by March–April), wet season May–October when the temples turn lush and moats fill.",
    months: climate("DDDDWWWWWWDD", {
      3: "very hot",
      4: "hottest month",
      9: "wettest; Angkor lush and green",
      10: "wettest; reflecting moats",
    }),
    sights: [],
  },
  {
    id: "philippines-palawan",
    name: "El Nido & Palawan",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 11.1949,
    lng: 119.4013,
    bookingDest: "El Nido, Palawan, Philippines",
    climateBlurb:
      "Dry season roughly December–May (hottest April–May), wet season June–November with typhoon risk later in the year.",
    months: climate("DDDDDWWWWWWD", {
      4: "driest and hottest",
      8: "wettest month",
      9: "typhoon risk",
    }),
    sights: [],
  },
  // ───────────────────────── South America ─────────────────────────
  {
    id: "peru-cusco",
    name: "Cusco & Machu Picchu",
    country: "Peru",
    continent: "South America",
    lat: -13.532,
    lng: -71.9675,
    bookingDest: "Cusco, Peru",
    climateBlurb:
      "Andean highlands: dry season May–September (sunny days, cold nights, prime trekking), wet season October–April with afternoon rain.",
    months: climate("WWWSDDDDDSWW", {
      2: "wettest; Inca Trail closed for maintenance",
      6: "peak dry season — best trekking, busiest",
      7: "peak dry season — clear skies, crowds",
      8: "dry and busy",
    }),
    sights: [],
  },
  {
    id: "bolivia-uyuni",
    name: "Uyuni Salt Flats",
    country: "Bolivia",
    continent: "South America",
    lat: -20.4597,
    lng: -66.8253,
    bookingDest: "Uyuni, Bolivia",
    climateBlurb:
      "Dry season May–October lets vehicles cross the cracked salt hexagons; the wet season December–March floods the flats into a giant mirror.",
    months: climate("WWWSDDDDDDSW", {
      1: "mirror effect — flats flooded",
      2: "mirror effect; some areas inaccessible",
      6: "dry crossing, freezing nights",
      7: "dry crossing, freezing nights",
      12: "rains begin — mirror season starts",
    }),
    sights: [],
  },
  {
    id: "patagonia-elcalafate",
    name: "Patagonia (El Calafate)",
    country: "Argentina & Chile",
    continent: "South America",
    lat: -50.3379,
    lng: -72.2648,
    bookingDest: "El Calafate, Argentina",
    climateBlurb:
      "Far-south Patagonia is a summer destination: long days and (very windy) mild weather November–March; deep winter June–August closes many trails and lodges.",
    // Note: Patagonia is semi-arid (low rain year-round), so "wet" here means
    // "avoid" — the deep cold/closures of winter — rather than literal rainfall.
    months: climate("DDSSWWWWSSDD", {
      1: "peak summer — long days, fierce wind",
      2: "peak summer, busiest",
      7: "winter; many trails and lodges closed",
      8: "winter; widespread closures",
    }),
    sights: [],
  },
  {
    id: "brazil-rio",
    name: "Rio de Janeiro",
    country: "Brazil",
    continent: "South America",
    lat: -22.9068,
    lng: -43.1729,
    bookingDest: "Rio de Janeiro, Brazil",
    climateBlurb:
      "Hot, humid and rainy in the southern summer December–March (Carnival season); mildest and driest in winter June–August.",
    months: climate(
      "WWWSSDDDSSWW",
      {
        2: "Carnival — hot, humid, packed",
        7: "mildest and driest",
        12: "hot; summer rains begin",
      },
      // Carnival and New Year's pack the city despite it being wet season.
      { 2: "high", 12: "high" }
    ),
    sights: [],
  },
  {
    id: "brazil-amazon-manaus",
    name: "Amazon (Manaus)",
    country: "Brazil",
    continent: "South America",
    lat: -3.119,
    lng: -60.0217,
    bookingDest: "Manaus, Brazil",
    climateBlurb:
      "The Amazon swaps high and low water rather than hot and cold: high-water December–May floods the forest for canoeing; low-water July–October exposes river beaches and trails.",
    months: climate("WWWWWSDDDDSW", {
      4: "peak high water — flooded-forest canoeing",
      8: "low water — river beaches appear",
      9: "low water — best jungle hiking",
      12: "rains return, water rising",
    }),
    sights: [],
  },
  {
    id: "colombia-cartagena",
    name: "Cartagena",
    country: "Colombia",
    continent: "South America",
    lat: 10.391,
    lng: -75.4794,
    bookingDest: "Cartagena, Colombia",
    climateBlurb:
      "Caribbean-coast warmth year-round; driest and breeziest December–April, with the heaviest rains around September–October.",
    months: climate("DDDSWSSWWWWD", {
      1: "dry, breezy, ideal",
      10: "wettest month",
      12: "dry season returns",
    }),
    sights: [],
  },
  {
    id: "chile-atacama",
    name: "Atacama (San Pedro)",
    country: "Chile",
    continent: "South America",
    lat: -22.9087,
    lng: -68.1997,
    bookingDest: "San Pedro de Atacama, Chile",
    climateBlurb:
      "The driest desert on Earth — clear skies almost every day. The only real rain is the brief 'Bolivian winter' on the altiplano in January–February.",
    months: climate("SSDDDDDDDDDD", {
      1: "occasional altiplano storms (Bolivian winter)",
      2: "occasional altiplano storms",
    }),
    sights: [],
  },
  {
    id: "ecuador-galapagos",
    name: "Galápagos Islands",
    country: "Ecuador",
    continent: "South America",
    lat: -0.7437,
    lng: -90.3136,
    bookingDest: "Puerto Ayora, Galapagos, Ecuador",
    climateBlurb:
      "Rewarding year-round — there's no real dry/wet split. Warm and calm December–May (sunny between showers, best snorkeling); cool and misty June–November (the garúa — choppier seas but peak marine wildlife).",
    months: climate(
      "SSSSSSSSSSSS",
      {
        3: "warmest, calm seas — great snorkeling",
        6: "cool, misty garúa begins",
        9: "cool season — peak marine wildlife",
      },
      // Mid-year holidays spike visitor numbers.
      { 7: "high", 8: "high" }
    ),
    sights: [],
  },
  // ─────────────────────── Europe (Mediterranean) ───────────────────────
  {
    id: "albania-riviera",
    name: "Albanian Riviera",
    country: "Albania",
    continent: "Europe",
    lat: 39.8756,
    lng: 20.0053,
    bookingDest: "Sarandë, Albania",
    climateBlurb:
      "Mediterranean climate — the seasons are inverted from the tropics: hot, dry, beach-perfect summers June–September and mild, wet winters October–April. Spring and autumn stay warm, green, and uncrowded.",
    months: climate("WWWSSDDDDSWW", {
      5: "warm shoulder, fewer crowds",
      7: "peak beach season — hot and busy",
      8: "peak beach season — hot and busy",
      11: "wettest month",
    }),
    sights: [],
  },
  {
    id: "montenegro-kotor",
    name: "Bay of Kotor",
    country: "Montenegro",
    continent: "Europe",
    lat: 42.4247,
    lng: 18.7712,
    bookingDest: "Kotor, Montenegro",
    climateBlurb:
      "Mediterranean coast backed by mountains: dry, sunny summers June–September and notably wet winters — Kotor is among Europe's rainiest spots. The shoulder months are warm and quiet.",
    months: climate("WWWSSDDDDSWW", {
      5: "warm shoulder, fewer crowds",
      7: "peak season — busy coast",
      8: "peak season — busy coast",
      11: "very wet — among Europe's rainiest",
    }),
    sights: [],
  },
  {
    id: "turkey-cappadocia",
    name: "Cappadocia",
    country: "Turkey",
    continent: "Europe",
    lat: 38.6431,
    lng: 34.8307,
    bookingDest: "Cappadocia, Turkey",
    climateBlurb:
      "High-plateau Anatolia: clear and mild in spring (Apr–Jun) and autumn (Sep–Oct) — prime for balloon flights — with hot summers and cold, snowy winters.",
    months: climate("WWSDDDSSDDSW", {
      4: "ideal — clear balloon mornings",
      7: "hot and dusty",
      10: "ideal — crisp and clear",
      1: "cold & snowy",
    }),
    sights: [],
  },
  {
    id: "greece-santorini",
    name: "Santorini & the Cyclades",
    country: "Greece",
    continent: "Europe",
    lat: 36.4072,
    lng: 25.4567,
    bookingDest: "Santorini, Greece",
    climateBlurb:
      "Classic Mediterranean: hot, dry, sun-soaked May–October (peak and pricey Jul–Aug) and mild, wetter winters November–April. May–June and September are the sweet spots.",
    months: climate("WWWSDDDDDSWW", {
      5: "warm shoulder, fewer crowds",
      7: "peak season — hot and busy",
      8: "peak season — hot and busy",
      9: "warm shoulder, ideal",
    }),
    sights: [],
  },
  // ──────────────────────────── North America ───────────────────────────
  {
    id: "mexico-yucatan",
    name: "Yucatán & Riviera Maya",
    country: "Mexico",
    continent: "North America",
    lat: 20.2114,
    lng: -87.4654,
    bookingDest: "Tulum, Mexico",
    climateBlurb:
      "Caribbean Mexico: dry, sunny December–April (peak), a hot, humid wet season May–October, with hurricane risk strongest August–October.",
    months: climate("DDDDSWWWWWSD", {
      4: "driest, hot",
      9: "wettest; hurricane risk",
      10: "hurricane risk easing",
    }),
    sights: [],
  },
  // ───────────────────────────── South Asia ─────────────────────────────
  {
    id: "india-rajasthan",
    name: "Rajasthan (Jaipur & Udaipur)",
    country: "India",
    continent: "South Asia",
    lat: 26.9124,
    lng: 75.7873,
    bookingDest: "Jaipur, India",
    climateBlurb:
      "Cool, dry and ideal October–March; a fierce dry heat April–June; then the monsoon July–September. Forts and palaces shine in the winter months.",
    months: climate("DDDSSWWWWDDD", {
      1: "cool, ideal",
      5: "extreme heat (45°C+)",
      7: "monsoon — wettest",
      11: "cool, ideal; festivals",
    }),
    sights: [],
  },
  {
    id: "sri-lanka-south",
    name: "Sri Lanka (South & Hills)",
    country: "Sri Lanka",
    continent: "South Asia",
    lat: 7.2906,
    lng: 80.6337,
    bookingDest: "Kandy, Sri Lanka",
    climateBlurb:
      "The south, west and hill country are driest December–March; the southwest monsoon brings rain May–September, with a second wet spell around October–November.",
    months: climate("DDDSWWWWWWSD", {
      4: "inter-monsoon, warm",
      6: "southwest monsoon — wettest",
      10: "second rains (inter-monsoon)",
    }),
    sights: [],
  },
  {
    id: "nepal-kathmandu",
    name: "Kathmandu & Himalaya",
    country: "Nepal",
    continent: "South Asia",
    lat: 27.7172,
    lng: 85.324,
    bookingDest: "Kathmandu, Nepal",
    climateBlurb:
      "Clear, dry skies October–April make the Himalaya shine; the summer monsoon (Jun–Sep) clouds the peaks and slicks the trails. Autumn and spring are peak trekking.",
    months: climate("SSDDSWWWWDDS", {
      1: "cold but clear",
      4: "spring trekking; some haze",
      6: "monsoon begins",
      10: "peak trekking — clearest mountain views",
      11: "peak trekking — crisp and clear",
    }),
    sights: [],
  },
  // ───────────────────────────── East Asia ──────────────────────────────
  {
    id: "japan-kyoto",
    name: "Kyoto & Kansai",
    country: "Japan",
    continent: "East Asia",
    lat: 35.0116,
    lng: 135.7681,
    bookingDest: "Kyoto, Japan",
    climateBlurb:
      "Spring (cherry blossom) and autumn (foliage) are the golden windows; the rainy season (tsuyu) hits Jun–Jul and summers are hot and typhoon-prone into September.",
    months: climate(
      "SSDDDWWWWDDS",
      {
        4: "cherry blossom — spectacular but busy",
        6: "rainy season (tsuyu)",
        9: "typhoon risk",
        11: "autumn foliage",
      },
      // August is packed (Obon holiday + school break) despite the summer rain.
      { 8: "high" }
    ),
    sights: [],
  },
  {
    id: "japan-tokyo",
    name: "Tokyo & around",
    country: "Japan",
    continent: "East Asia",
    lat: 35.6762,
    lng: 139.6503,
    bookingDest: "Tokyo, Japan",
    climateBlurb:
      "Spring (cherry blossom) and autumn (crisp, clear) are the golden windows; the rainy season hits June, summers are hot and humid, and winters are cold but dry and sunny.",
    months: climate(
      "SSDDDWWWWDDS",
      {
        4: "cherry blossom — spectacular but busy",
        6: "rainy season (tsuyu)",
        9: "typhoon risk",
        11: "autumn foliage",
      },
      { 8: "high" }
    ),
    sights: [],
  },
  {
    id: "japan-hokkaido",
    name: "Hokkaido (Sapporo)",
    country: "Japan",
    continent: "East Asia",
    lat: 43.0618,
    lng: 141.3545,
    bookingDest: "Sapporo, Japan",
    climateBlurb:
      "Japan's north has two peak seasons and no June rainy season: world-class powder snow December–March and cool, green summers June–September (lavender in July). Spring thaw and late autumn are the quiet shoulders.",
    months: climate("DDDSSDDDDSSD", {
      1: "peak powder — skiing",
      2: "peak powder — skiing",
      7: "lavender fields in bloom",
      9: "early autumn foliage",
      12: "ski season begins",
    }),
    sights: [],
  },
  {
    id: "japan-okinawa",
    name: "Okinawa",
    country: "Japan",
    continent: "East Asia",
    lat: 26.2124,
    lng: 127.6809,
    bookingDest: "Okinawa, Japan",
    climateBlurb:
      "Subtropical islands with a different rhythm to the mainland: warm, dry spring (Mar–Apr) and autumn (Oct–Nov) are ideal; a May–June rainy season and Aug–Sep typhoons bracket a hot summer; winters stay mild.",
    months: climate("SSDDWWSWWDDS", {
      3: "warm spring — ideal beaches",
      5: "rainy season (tsuyu)",
      8: "typhoon peak",
      10: "warm, calm — great beaches",
    }),
    sights: [],
  },
  // ─────────────────────────────── Africa ───────────────────────────────
  {
    id: "morocco-marrakech",
    name: "Marrakech & Atlas",
    country: "Morocco",
    continent: "Africa",
    lat: 31.6295,
    lng: -7.9811,
    bookingDest: "Marrakech, Morocco",
    climateBlurb:
      "Semi-arid: spring (Mar–May) and autumn (Sep–Nov) are ideal, high summer (Jun–Aug) is scorching, and mild winters bring what little rain there is.",
    months: climate("SSDDDSSSDDDS", {
      1: "mild; occasional rain",
      4: "ideal — warm and clear",
      7: "scorching (40°C+)",
      8: "scorching (40°C+)",
      10: "ideal — warm and clear",
    }),
    sights: [],
  },
  {
    id: "tanzania-zanzibar",
    name: "Zanzibar",
    country: "Tanzania",
    continent: "Africa",
    lat: -6.1659,
    lng: 39.2026,
    bookingDest: "Zanzibar, Tanzania",
    climateBlurb:
      "An Indian-Ocean island: dry and ideal June–October and December–February, with the long rains March–May (best avoided) and short rains around November.",
    months: climate("DDWWWDDDDDSD", {
      3: "long rains begin — avoid",
      4: "long rains — wettest",
      7: "dry, ideal",
      11: "short rains",
    }),
    sights: [],
  },
  {
    id: "south-africa-capetown",
    name: "Cape Town",
    country: "South Africa",
    continent: "Africa",
    lat: -33.9249,
    lng: 18.4241,
    bookingDest: "Cape Town, South Africa",
    climateBlurb:
      "Southern-hemisphere Mediterranean: warm, dry summers November–March (peak) and cool, wet winters June–August. Spring and autumn are mild and quiet.",
    months: climate("DDDSWWWWSDDD", {
      1: "peak summer — warm, busy",
      6: "wettest, cool",
      7: "wettest, cool",
      11: "spring — wildflowers",
    }),
    sights: [],
  },
  // ───────────────────────── North America ─────────────────────────
  {
    id: "costa-rica-arenal",
    name: "Arenal & Monteverde",
    country: "Costa Rica",
    continent: "North America",
    lat: 10.4633,
    lng: -84.6531,
    bookingDest: "La Fortuna, Costa Rica",
    climateBlurb:
      "Classic dry/green-season split: sunny, settled dry season January–April; the green (wet) season May–December brings afternoon downpours, lush jungle and a brief mid-year dry spell (veranillo) around July.",
    months: climate("DDDDWWSWWWWW", {
      2: "driest, sunniest months",
      4: "end of the dry season",
      7: "brief mid-year dry spell (veranillo)",
      9: "green season — heavy afternoon rain",
      10: "wettest; some rural roads flood",
    }),
    sights: [],
  },
  // ───────────────────────── Africa ─────────────────────────
  {
    id: "egypt-cairo",
    name: "Cairo & Luxor",
    country: "Egypt",
    continent: "Africa",
    lat: 30.0444,
    lng: 31.2357,
    bookingDest: "Cairo, Egypt",
    climateBlurb:
      "Desert-dry all year — the real variable is heat. Cool, comfortable November–March is peak season; spring and autumn are warm shoulders; May–September brings brutal heat, especially in Upper Egypt (Luxor/Aswan).",
    months: climate("DDDSWWWWWSDD", {
      1: "ideal — cool and dry",
      4: "warm shoulder",
      6: "extreme desert heat",
      8: "extreme heat — tough in Luxor",
      12: "peak season, cool and dry",
    }),
    sights: [],
  },
  // ───────────────────────── South Asia ─────────────────────────
  {
    id: "india-agra",
    name: "Agra & Delhi",
    country: "India",
    continent: "South Asia",
    lat: 27.1767,
    lng: 78.0081,
    bookingDest: "Agra, India",
    climateBlurb:
      "North India's Golden Triangle: cool, dry winters October–March are the sweet spot (with morning fog in Dec–Jan); April–June is searingly hot; the monsoon brings rain July–September.",
    months: climate("DDSSSWWWWSDD", {
      1: "cool and dry — ideal (some fog)",
      5: "extreme pre-monsoon heat (still dry)",
      7: "monsoon rains",
      11: "peak season — cool and clear",
    }),
    sights: [],
  },
  // ───────────────────────── Europe ─────────────────────────
  {
    id: "france-paris",
    name: "Paris",
    country: "France",
    continent: "Europe",
    lat: 48.8566,
    lng: 2.3522,
    bookingDest: "Paris, France",
    climateBlurb:
      "Mild and temperate with rain spread across the year. Late spring (May–June) and early autumn (September) are loveliest; July–August is warm but busy; November–February is cold and grey (but festive).",
    months: climate("WWSSDDSSDSWW", {
      5: "mild and blooming — ideal",
      6: "long, warm days — ideal",
      8: "warm but crowded; locals away",
      9: "warm, fewer crowds",
      12: "cold and grey, but festive",
    }),
    sights: [],
  },
  {
    id: "italy-rome",
    name: "Rome",
    country: "Italy",
    continent: "Europe",
    lat: 41.9028,
    lng: 12.4964,
    bookingDest: "Rome, Italy",
    climateBlurb:
      "Mediterranean: hot, dry summers and mild, rainy winters. Spring (April–May) and autumn (September–October) are the sweet spots; July–August is fierce and crowded; winters are cool and damp.",
    months: climate("WWSDDSSSDDWW", {
      4: "spring — ideal",
      5: "warm and lovely — ideal",
      8: "hot; many places shut for Ferragosto",
      9: "warm, ideal",
      1: "cool and rainy",
    }),
    sights: [],
  },
  // ───────────────────────── Oceania ─────────────────────────
  {
    id: "australia-sydney",
    name: "Sydney",
    country: "Australia",
    continent: "Oceania",
    lat: -33.8688,
    lng: 151.2093,
    bookingDest: "Sydney, Australia",
    climateBlurb:
      "Southern-hemisphere temperate: warm summers December–February (beach peak, busy over the holidays), mild winters June–August, and gloriously mild spring and autumn shoulders.",
    months: climate("DDSSSWWWSDDD", {
      1: "summer — beaches and festivals",
      6: "cool, mild winter",
      10: "spring — warm and clear",
      12: "summer peak (holiday crowds)",
    }, { 1: "high", 12: "high" }),
    sights: [],
  },
  {
    id: "newzealand-queenstown",
    name: "Queenstown",
    country: "New Zealand",
    continent: "Oceania",
    lat: -45.0312,
    lng: 168.6626,
    bookingDest: "Queenstown, New Zealand",
    climateBlurb:
      "Alpine four-season town: warm summers December–February for hiking and lakes, snowy winters June–August for skiing, and a spectacular golden autumn. A true year-round destination depending on what you're after.",
    months: climate("DDSSSSSSSSDD", {
      1: "summer — hiking and lakes",
      4: "golden autumn colour",
      7: "ski season — cold and snowy",
      12: "summer peak",
    }),
    sights: [],
  },
  // ───────────────────── Philippines (more) ─────────────────────
  {
    id: "philippines-manila",
    name: "Manila",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 14.5995,
    lng: 120.9842,
    bookingDest: "Manila, Philippines",
    climateBlurb:
      "The gateway capital: cool, dry and most comfortable December–February, blisteringly hot March–May, then the southwest monsoon brings heavy rain and typhoons June–October.",
    months: climate("DDDSSWWWWWSD", {
      4: "peak heat and humidity",
      8: "typhoon season — flooding likely",
      12: "cool, dry — the best window",
    }),
    sights: [],
  },
  {
    id: "philippines-cebu",
    name: "Cebu",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 10.3157,
    lng: 123.8854,
    bookingDest: "Cebu, Philippines",
    climateBlurb:
      "Central Visayas hub for diving and waterfalls: dry and sunny December–May, with the wetter, occasionally stormy season June–November. Relatively sheltered from the worst typhoons.",
    months: climate("DDDDDWWWWWWD", {
      1: "dry & sunny — peak",
      4: "hottest, very dry",
      10: "wettest; typhoon risk",
    }),
    sights: [],
  },
  {
    id: "philippines-boracay",
    name: "Boracay",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 11.9674,
    lng: 121.9248,
    bookingDest: "Boracay, Philippines",
    climateBlurb:
      "The famous white-sand island: calm, sunny Amihan season November–May (peak, with December–April best), then the Habagat southwest monsoon brings rain and rougher seas June–October.",
    months: climate("DDDDSWWWWWSS", {
      1: "Amihan season — calm & sunny (peak)",
      4: "driest and hottest",
      8: "Habagat monsoon — rough seas",
      12: "busy holidays, but some rain",
    }),
    sights: [],
  },
  {
    id: "philippines-bohol",
    name: "Bohol & Panglao",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 9.85,
    lng: 124.1435,
    bookingDest: "Bohol, Philippines",
    climateBlurb:
      "Chocolate Hills, tarsiers and Panglao's beaches: dry and sunny December–May, then a wetter June–November. The Chocolate Hills turn brown in the dry months that give them their name.",
    months: climate("DDDDDWWWWWWS", {
      2: "dry & sunny — ideal",
      4: "hills turn 'chocolate' brown",
      10: "wettest month",
    }),
    sights: [],
  },
  {
    id: "philippines-siargao",
    name: "Siargao",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 9.8482,
    lng: 126.0458,
    bookingDest: "Siargao, Philippines",
    climateBlurb:
      "The surf-and-lagoon island faces the Pacific, so it runs opposite to the west: driest and sunniest April–August, the big-swell surf season September–November, and the wettest stretch December–February.",
    months: climate("WWSDDDDDSSWW", {
      1: "wettest months (calm seas)",
      5: "dry & sunny",
      9: "surf season — bigger swell",
      12: "wet season",
    }),
    sights: [],
  },
  {
    id: "philippines-banaue",
    name: "Banaue & Batad",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 16.9114,
    lng: 121.0586,
    bookingDest: "Banaue, Philippines",
    climateBlurb:
      "The 2,000-year-old Cordillera rice terraces, high in northern Luzon. Cool and drier November–May (clearest views); the June–October monsoon turns the terraces vivid green but brings landslide risk.",
    months: climate("DDDDSWWWWWSD", {
      2: "clear, dry — best views",
      4: "golden terraces (harvest)",
      7: "lush green, but landslide risk",
    }),
    sights: [],
  },
  {
    id: "philippines-dumaguete",
    name: "Dumaguete",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 9.3103,
    lng: 123.3081,
    bookingDest: "Dumaguete, Philippines",
    climateBlurb:
      "The laid-back 'City of Gentle People' on Negros — a diving and university town and the springboard to Apo Island. Driest and sunniest December–May; the wetter season runs June–November, heaviest late in the year.",
    months: climate("DDDDDWWWWWSD", {
      3: "driest and sunniest",
      10: "wettest month",
      12: "dry and pleasant",
    }),
    sights: [],
  },
  // ───────────────────────── Malaysia ─────────────────────────
  {
    id: "malaysia-kualalumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    continent: "Southeast Asia",
    lat: 3.139,
    lng: 101.6869,
    bookingDest: "Kuala Lumpur, Malaysia",
    climateBlurb:
      "Equatorial capital — warm and humid year-round with rain in every month. Slightly drier June–August and January–February; the inter-monsoon brings heavier thunderstorms around April and October–November.",
    months: climate("DDSWSDDDSWWS", {
      4: "thunderstorm peak",
      6: "drier spell",
      11: "wettest month",
    }),
    sights: [],
  },
  {
    id: "malaysia-penang",
    name: "Penang",
    country: "Malaysia",
    continent: "Southeast Asia",
    lat: 5.4141,
    lng: 100.3288,
    bookingDest: "Penang, Malaysia",
    climateBlurb:
      "The street-food and heritage capital. Warm and humid all year; driest December–February, with the wettest stretch during the inter-monsoon September–November.",
    months: climate("DDSWSSSWWWSD", {
      1: "drier, pleasant",
      9: "wettest month",
      10: "heavy inter-monsoon rain",
    }),
    sights: [],
  },
  {
    id: "malaysia-langkawi",
    name: "Langkawi",
    country: "Malaysia",
    continent: "Southeast Asia",
    lat: 6.35,
    lng: 99.8,
    bookingDest: "Langkawi, Malaysia",
    climateBlurb:
      "Duty-free island of beaches and rainforest. The dry season December–March is calmest and sunniest; the wetter southwest monsoon runs April–October.",
    months: climate("DDDSWWWWWWSD", {
      1: "dry, calm seas — peak",
      4: "monsoon begins",
      9: "wettest month",
    }),
    sights: [],
  },
  {
    id: "malaysia-malacca",
    name: "Malacca",
    country: "Malaysia",
    continent: "Southeast Asia",
    lat: 2.1896,
    lng: 102.2501,
    bookingDest: "Malacca, Malaysia",
    climateBlurb:
      "A UNESCO trading city layering Malay, Portuguese, Dutch and Chinese history. Equatorial and humid year-round; wettest around the inter-monsoon (April and October–November), drier June–August.",
    months: climate("DDSWSDDDSWWS", {
      4: "thunderstorms",
      11: "wettest month",
    }),
    sights: [],
  },
  {
    id: "malaysia-sabah",
    name: "Sabah (Kota Kinabalu)",
    country: "Malaysia",
    continent: "Southeast Asia",
    lat: 5.9804,
    lng: 116.0735,
    bookingDest: "Kota Kinabalu, Malaysia",
    climateBlurb:
      "Borneo's gateway to Mount Kinabalu, islands and wildlife. Driest and best February–April; the northeast monsoon brings the heaviest rain October–January.",
    months: climate("WSDDSSSSWWWW", {
      3: "driest — best for climbing",
      10: "monsoon rain builds",
      12: "wettest month",
    }),
    sights: [],
  },
  // ───────────────────── Philippines (more) ─────────────────────
  {
    id: "philippines-coron",
    name: "Coron",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 12.005,
    lng: 120.204,
    bookingDest: "Coron, Philippines",
    climateBlurb:
      "Northern Palawan's wreck-diving and lagoon paradise. Dry and calm December–May (best December–April); the wet season June–October brings rain and rougher seas, with typhoon risk.",
    months: climate("DDDDSWWWWWSD", {
      1: "dry, calm — peak",
      4: "driest, hottest",
      9: "wettest; typhoon risk",
    }),
    sights: [],
  },
  {
    id: "philippines-vigan",
    name: "Vigan",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 17.5747,
    lng: 120.3869,
    bookingDest: "Vigan, Philippines",
    climateBlurb:
      "A UNESCO Spanish-colonial town in northern Luzon, with cobblestone streets and heritage houses. Dry and pleasant November–April; the southwest monsoon brings rain June–October.",
    months: climate("DDDDSWWWWWSD", {
      2: "cool, dry — ideal",
      7: "monsoon rains",
      12: "festive and dry",
    }),
    sights: [],
  },
  {
    id: "philippines-batanes",
    name: "Batanes",
    country: "Philippines",
    continent: "Southeast Asia",
    lat: 20.449,
    lng: 121.971,
    bookingDest: "Batanes, Philippines",
    climateBlurb:
      "The Philippines' remote northernmost islands — rolling green hills, stone houses and dramatic cliffs. Best March–June (dry, mild); typhoon-prone July–October; cool and windy in the December–February 'amihan'.",
    months: climate("SSDDDSWWWWSS", {
      4: "green hills, mild — ideal",
      8: "typhoon season",
      1: "cool, windy amihan",
    }),
    sights: [],
  },
  {
    id: "thailand-huahin",
    name: "Hua Hin",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 12.5684,
    lng: 99.9577,
    bookingDest: "Hua Hin, Thailand",
    climateBlurb:
      "A royal seaside resort town on the Gulf, and one of the drier corners of Thailand. Cool and dry December–February (peak), hot but still dry March–April; the rains build through the year to a wet October–November.",
    months: climate("DDDDSSSSWWWD", {
      1: "cool, dry — peak",
      4: "hottest, still dry",
      10: "wettest month",
    }),
    sights: [],
  },
  // ───────────────────── North America (more) ─────────────────────
  {
    id: "mexico-playadelcarmen",
    name: "Playa del Carmen",
    country: "Mexico",
    continent: "North America",
    lat: 20.6296,
    lng: -87.0739,
    bookingDest: "Playa del Carmen, Mexico",
    climateBlurb:
      "The Riviera Maya's lively beach hub for cenotes, reefs and Maya ruins. Dry and sunny December–April (peak); wetter May–October with hurricane risk peaking September–October, and sargassum seaweed possible May–August.",
    months: climate("DDDDSWWWWWSD", {
      3: "dry, sunny — peak",
      6: "sargassum seaweed can wash up",
      9: "peak hurricane season",
    }),
    sights: [],
  },
  {
    id: "thailand-kohphangan",
    name: "Koh Phangan",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 9.7333,
    lng: 100.0333,
    bookingDest: "Koh Phangan, Thailand",
    climateBlurb:
      "A Gulf-of-Thailand island of beaches, jungle and the legendary Full Moon Party. Driest and sunniest January–April (peak); a mostly fine May–September; then the northeast monsoon brings heavy rain October–December.",
    months: climate("SDDDDDDDWWWW", {
      3: "driest, sunniest — peak",
      11: "wettest month (NE monsoon)",
      12: "heavy rain, rough seas",
    }),
    sights: [],
  },
  {
    id: "thailand-kohtao",
    name: "Koh Tao",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 10.0956,
    lng: 99.8403,
    bookingDest: "Koh Tao, Thailand",
    climateBlurb:
      "The Gulf's diving island — cheap courses, clear water and granite coves. Driest and calmest January–April (peak); the northeast monsoon brings the heaviest rain and swell October–December.",
    months: climate("SDDDDDDDWWWW", {
      3: "driest, best visibility — peak",
      11: "wettest; diving may pause",
      12: "rough seas",
    }),
    sights: [],
  },
  {
    id: "thailand-phuket",
    name: "Phuket",
    country: "Thailand",
    continent: "Southeast Asia",
    lat: 7.8804,
    lng: 98.3923,
    bookingDest: "Phuket, Thailand",
    climateBlurb:
      "Thailand's biggest island, on the Andaman coast — beaches, nightlife and a heritage old town. Dry, calm and clear November–April; the southwest monsoon brings rain and swell May–October.",
    months: climate("DDDDWWWWWWSD", {
      2: "driest, clearest seas",
      9: "wettest month",
      11: "monsoon easing, fewer crowds",
    }),
    sights: [],
  },
  {
    id: "indonesia-gili",
    name: "Gili Islands & Lombok",
    country: "Indonesia",
    continent: "Southeast Asia",
    lat: -8.35,
    lng: 116.05,
    bookingDest: "Gili Trawangan, Indonesia",
    climateBlurb:
      "Bali's car-free island neighbours and the volcano island of Lombok. Dry, sunny April–October (peak); the wetter season November–March brings short, heavy downpours.",
    months: climate("WWWSDDDDDSWW", {
      7: "dry, calm seas — peak",
      1: "wettest month",
      10: "shoulder — quieter, still fine",
    }),
    sights: [],
  },
  {
    id: "cambodia-kohrong",
    name: "Koh Rong",
    country: "Cambodia",
    continent: "Southeast Asia",
    lat: 10.7,
    lng: 103.25,
    bookingDest: "Koh Rong, Cambodia",
    climateBlurb:
      "Cambodia's backpacker beach islands of white sand and bioluminescent water. Dry and sunny November–April; the southwest monsoon brings rain May–October, wettest September–October.",
    months: climate("DDDDSWWWWWSD", {
      1: "dry, calm — peak",
      4: "driest, hottest",
      10: "wettest; boats may pause",
    }),
    sights: [],
  },
  {
    id: "vietnam-phuquoc",
    name: "Phú Quốc",
    country: "Vietnam",
    continent: "Southeast Asia",
    lat: 10.2899,
    lng: 103.984,
    bookingDest: "Phu Quoc, Vietnam",
    climateBlurb:
      "Vietnam's big tropical island in the Gulf of Thailand — beaches, pepper farms and a national park. Dry and sunny November–April (peak); the southwest monsoon brings rain May–October.",
    months: climate("DDDDSWWWWWSD", {
      1: "dry, sunny — peak",
      4: "driest, hottest",
      8: "wettest month",
    }),
    sights: [],
  },
  {
    id: "india-goa",
    name: "Goa",
    country: "India",
    continent: "South Asia",
    lat: 15.2993,
    lng: 74.124,
    bookingDest: "Goa, India",
    climateBlurb:
      "India's beach-and-party state — Portuguese churches, markets and wellness in the south. Dry and pleasant November–March (peak); April–May is hot; the monsoon is heavy June–September.",
    months: climate("DDDSSWWWWSDD", {
      1: "warm, dry — peak",
      5: "hot, humid pre-monsoon",
      7: "heavy monsoon rain",
    }),
    sights: [],
  },
  {
    id: "maldives-atolls",
    name: "Maldives",
    country: "Maldives",
    continent: "South Asia",
    lat: 3.2028,
    lng: 73.2207,
    bookingDest: "Maldives",
    climateBlurb:
      "Coral atolls of overwater villas, house reefs and world-class diving. The dry northeast monsoon December–April is sunniest and calmest (peak); the wetter southwest monsoon runs May–November.",
    months: climate("DDDDWWWWWWSS", {
      2: "dry, calm, sunny — peak",
      6: "wettest, choppier seas",
      12: "high season begins (some rain)",
    }),
    sights: [],
  },
  {
    id: "indonesia-komodo",
    name: "Komodo & Labuan Bajo",
    country: "Indonesia",
    continent: "Southeast Asia",
    lat: -8.4964,
    lng: 119.8877,
    bookingDest: "Labuan Bajo, Indonesia",
    climateBlurb:
      "The dragons, pink beaches and manta-filled channels of the Flores Sea. A long dry season April–November (peak, sun-baked savannah); short wet season December–March.",
    months: climate("WWWSDDDDDDSW", {
      7: "dry, calm — peak diving",
      1: "wettest month",
      4: "shoulder — greener hills",
    }),
    sights: [],
  },
  {
    id: "indonesia-nusapenida",
    name: "Nusa Penida",
    country: "Indonesia",
    continent: "Southeast Asia",
    lat: -8.7278,
    lng: 115.5444,
    bookingDest: "Nusa Penida, Indonesia",
    climateBlurb:
      "The dramatic clifftop island off Bali — Kelingking's dinosaur ridge and manta dives. Dry, sunny April–October (peak); wetter, greener November–March.",
    months: climate("WWWSDDDDDSWW", {
      8: "dry, sunny — peak",
      1: "wettest month",
      9: "mola-mola dive season",
    }),
    sights: [],
  },
  // ───────────────────────── Oceania (more) ─────────────────────────
  {
    id: "frenchpolynesia-borabora",
    name: "Bora Bora",
    country: "French Polynesia",
    continent: "Oceania",
    lat: -16.5004,
    lng: -151.7415,
    bookingDest: "Bora Bora, French Polynesia",
    climateBlurb:
      "The South Pacific's turquoise-lagoon icon. The cooler, drier austral winter May–October is the sweet spot; the wetter, humid season November–April carries some cyclone risk.",
    months: climate("WWWSDDDDDSWW", {
      8: "dry, sunny — peak",
      1: "wettest, humid",
      6: "ideal lagoon weather",
    }),
    sights: [],
  },
  {
    id: "usa-maui",
    name: "Maui (Hawaii)",
    country: "United States",
    continent: "Oceania",
    lat: 20.7984,
    lng: -156.3319,
    bookingDest: "Maui, Hawaii",
    climateBlurb:
      "Volcanic beaches, the Road to Hāna and winter whales. Warm and drier on the leeward side April–October; wetter November–March (also peak humpback-whale season).",
    months: climate("WWSSDDDDDSWW", {
      8: "warm, dry leeward — peak",
      2: "wetter, but whale season",
      6: "fewer crowds, fine weather",
    }),
    sights: [],
  },
  // ───────────────────── North America (more) ─────────────────────
  {
    id: "puerto-rico-sanjuan",
    name: "San Juan & Puerto Rico",
    country: "Puerto Rico",
    continent: "North America",
    lat: 18.4655,
    lng: -66.1057,
    bookingDest: "San Juan, Puerto Rico",
    climateBlurb:
      "Caribbean island with a dry season December–April (peak, comfortable humidity) and a wetter, hotter June–November with hurricane risk peaking August–October. Year-round warmth, but the dry months are noticeably more pleasant.",
    months: climate("DDDDSSWWWWSD", {
      2: "dry, breezy — peak",
      8: "peak hurricane season",
      9: "wettest month + hurricane risk",
    }),
    sights: [],
  },
  // ───────────────────── South America (more) ─────────────────────
  {
    id: "brazil-florianopolis",
    name: "Florianópolis",
    country: "Brazil",
    continent: "South America",
    lat: -27.5954,
    lng: -48.548,
    bookingDest: "Florianopolis, Brazil",
    climateBlurb:
      "Southern Brazil's island beach capital. Warm, sunny summers December–March (peak, with holiday crowds); mild, drier winters June–August; spring and autumn are pleasant shoulders. Less tropical than Rio — genuinely four-season.",
    months: climate("DDDSSWWWSSDD", {
      1: "summer peak — beaches and festivals",
      6: "mild winter, drier",
      12: "summer begins — holiday crowds",
    }),
    sights: [],
  },
  {
    id: "brazil-curitiba",
    name: "Curitiba",
    country: "Brazil",
    continent: "South America",
    lat: -25.4284,
    lng: -49.2733,
    bookingDest: "Curitiba, Brazil",
    climateBlurb:
      "Southern Brazil's green, well-planned highland capital. Subtropical with cool, dry winters June–August and warm, wetter summers December–February. Known for unpredictable weather — 'four seasons in one day.' Gateway to the Serra do Mar train.",
    months: climate("WWWSSDDDDSWW", {
      1: "warm, wet summer",
      7: "cool, dry — clearest weather",
      10: "spring — wildflowers in the parks",
    }),
    sights: [],
  },
];

// Rough mid-range cost per person per day (USD): lodging + food + activities +
// local transport. Ballpark figures for budgeting, not quotes.
const DAILY_BUDGET: Record<string, number> = {
  "thailand-chiangmai": 40,
  "thailand-bangkok": 50,
  "thailand-krabi": 55,
  "thailand-kohsamui": 55,
  "indonesia-bali": 45,
  "vietnam-hoian": 40,
  "vietnam-hanoi": 40,
  "vietnam-hcmc": 40,
  "cambodia-siemreap": 40,
  "philippines-palawan": 50,
  "peru-cusco": 50,
  "bolivia-uyuni": 45,
  "patagonia-elcalafate": 110,
  "brazil-rio": 70,
  "brazil-amazon-manaus": 80,
  "colombia-cartagena": 55,
  "chile-atacama": 90,
  "ecuador-galapagos": 200,
  "albania-riviera": 50,
  "montenegro-kotor": 70,
  "sri-lanka-south": 40,
  "nepal-kathmandu": 35,
  "japan-kyoto": 130,
  "morocco-marrakech": 55,
  "tanzania-zanzibar": 80,
  "mexico-yucatan": 70,
  "india-rajasthan": 40,
  "turkey-cappadocia": 60,
  "greece-santorini": 90,
  "south-africa-capetown": 70,
  "japan-tokyo": 130,
  "japan-hokkaido": 120,
  "japan-okinawa": 100,
  "costa-rica-arenal": 80,
  "egypt-cairo": 50,
  "india-agra": 40,
  "france-paris": 140,
  "italy-rome": 120,
  "australia-sydney": 130,
  "newzealand-queenstown": 130,
  "philippines-manila": 45,
  "philippines-cebu": 45,
  "philippines-boracay": 60,
  "philippines-bohol": 50,
  "philippines-siargao": 50,
  "philippines-banaue": 35,
  "philippines-dumaguete": 40,
  "malaysia-kualalumpur": 55,
  "malaysia-penang": 45,
  "malaysia-langkawi": 60,
  "malaysia-malacca": 45,
  "malaysia-sabah": 60,
  "philippines-coron": 55,
  "philippines-vigan": 35,
  "philippines-batanes": 70,
  "thailand-huahin": 55,
  "mexico-playadelcarmen": 75,
  "thailand-kohphangan": 50,
  "thailand-kohtao": 45,
  "thailand-phuket": 60,
  "indonesia-gili": 50,
  "cambodia-kohrong": 45,
  "vietnam-phuquoc": 50,
  "india-goa": 40,
  "maldives-atolls": 250,
  "indonesia-komodo": 70,
  "indonesia-nusapenida": 45,
  "frenchpolynesia-borabora": 350,
  "usa-maui": 200,
  "puerto-rico-sanjuan": 85,
  "brazil-florianopolis": 65,
  "brazil-curitiba": 55,
};

// Wikipedia article titles for representative photos. Single source of truth in
// wiki-titles.json so scripts/fetch-photos.mjs and the app can't drift apart.
const WIKI_TITLE = wikiTitles as Record<string, string>;
const PHOTOS = photos as Record<string, string>;

// Practical essentials per destination. Indicative (esp. visa) — the UI shows a
// "verify for your nationality" disclaimer.
const TRAVEL_INFO: Record<string, TravelInfo> = {
  "thailand-chiangmai": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Chiang Mai (CNX) via Bangkok · ~13h from London", health: "Crop-burning haze Mar–Apr; mosquito repellent" },
  "thailand-bangkok": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Bangkok (BKK) · ~11h from London", health: "Generally safe; mind traffic & street-food hygiene" },
  "thailand-krabi": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Krabi (KBV) via Bangkok · ~13h from London", health: "Strong sun & sea currents; reef-safe sunscreen" },
  "thailand-kohsamui": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Samui (USM) via Bangkok · ~13h from London", health: "Sun & sea safety; mosquito repellent" },
  "indonesia-bali": { visa: "Visa on arrival (30 days) for many", currency: "Indonesian rupiah (IDR)", language: "Indonesian (Balinese)", plugs: "Types C/F · 230V", gettingThere: "Denpasar (DPS) · ~16h from London (1 stop)", health: "Dengue — repellent; care on scooters" },
  "vietnam-hoian": { visa: "e-Visa (most); some visa-free", currency: "Vietnamese đồng (VND)", language: "Vietnamese", plugs: "Types A/C/F · 220V", gettingThere: "Da Nang (DAD) via hub · ~14h from London", health: "Flood & typhoon risk Oct–Nov" },
  "vietnam-hanoi": { visa: "e-Visa (most); some visa-free", currency: "Vietnamese đồng (VND)", language: "Vietnamese", plugs: "Types A/C/F · 220V", gettingThere: "Hanoi (HAN) · ~12h from London", health: "Air quality can dip; mind traffic" },
  "vietnam-hcmc": { visa: "e-Visa (most); some visa-free", currency: "Vietnamese đồng (VND)", language: "Vietnamese", plugs: "Types A/C/F · 220V", gettingThere: "Ho Chi Minh City (SGN) · ~12h from London", health: "Dengue — repellent; mind traffic" },
  "cambodia-siemreap": { visa: "e-Visa / visa on arrival", currency: "Riel (KHR); USD widely used", language: "Khmer", plugs: "Types A/C/G · 230V", gettingThere: "Siem Reap (SAI) via hub · ~14h from London", health: "Heat & dehydration; mosquito repellent" },
  "philippines-palawan": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "El Nido/Puerto Princesa via Manila · ~16h from London", health: "Strong sun & currents; dengue — repellent" },
  "peru-cusco": { visa: "Visa-free 90–183 days for many", currency: "Peruvian sol (PEN)", language: "Spanish (Quechua)", plugs: "Types A/C · 220V", gettingThere: "Cusco (CUZ) via Lima · ~16h from London", health: "Altitude 3,400m — acclimatize & hydrate" },
  "bolivia-uyuni": { visa: "Visa-free for many; US needs visa", currency: "Boliviano (BOB)", language: "Spanish (Quechua/Aymara)", plugs: "Types A/C · 230V", gettingThere: "Uyuni (UYU) via La Paz · ~18h from London", health: "Altitude 3,600m+; cold nights — layers" },
  "patagonia-elcalafate": { visa: "Visa-free 90 days for many", currency: "Argentine & Chilean peso", language: "Spanish", plugs: "Types C/I/L · 220V", gettingThere: "El Calafate (FTE) via Buenos Aires · ~17h from London", health: "Fierce wind & sun; dress in layers" },
  "brazil-rio": { visa: "Visa-free ~90 days for many", currency: "Brazilian real (BRL)", language: "Portuguese", plugs: "Types C/N · 127/220V", gettingThere: "Rio de Janeiro (GIG) · ~11h from London", health: "Petty theft — stay aware; strong sun" },
  "brazil-amazon-manaus": { visa: "Visa-free ~90 days for many", currency: "Brazilian real (BRL)", language: "Portuguese", plugs: "Types C/N · 127V", gettingThere: "Manaus (MAO) via São Paulo · ~14h from London", health: "Yellow-fever vaccine advised; repellent" },
  "colombia-cartagena": { visa: "Visa-free ~90 days for many", currency: "Colombian peso (COP)", language: "Spanish", plugs: "Types A/B · 110V", gettingThere: "Cartagena (CTG) via Bogotá · ~13h from London", health: "Strong sun; petty-theft awareness" },
  "chile-atacama": { visa: "Visa-free 90 days for many", currency: "Chilean peso (CLP)", language: "Spanish", plugs: "Types C/L · 220V", gettingThere: "Calama (CJC) via Santiago · ~17h from London", health: "Altitude & intense UV — hydrate, SPF" },
  "ecuador-galapagos": { visa: "Visa-free 90 days; transit card + park fee", currency: "US dollar (USD)", language: "Spanish", plugs: "Types A/B · 120V", gettingThere: "Baltra (GPS) via Quito/Guayaquil · ~16h from London", health: "Intense equatorial sun; follow park rules" },
  "albania-riviera": { visa: "Visa-free ~90 days for many", currency: "Albanian lek (ALL)", language: "Albanian", plugs: "Types C/F · 230V", gettingThere: "Tirana (TIA) · ~3h from London", health: "Very safe; standard sun care" },
  "montenegro-kotor": { visa: "Visa-free ~90 days for many", currency: "Euro (EUR)", language: "Montenegrin", plugs: "Types C/F · 230V", gettingThere: "Tivat (TIV) · ~3h from London", health: "Very safe; winding mountain roads" },
  "sri-lanka-south": { visa: "ETA / e-Visa required for most", currency: "Sri Lankan rupee (LKR)", language: "Sinhala & Tamil", plugs: "Types D/G/M · 230V", gettingThere: "Colombo (CMB) · ~11h from London", health: "Dengue — repellent; strong sun" },
  "nepal-kathmandu": { visa: "Visa on arrival for most", currency: "Nepalese rupee (NPR)", language: "Nepali", plugs: "Types C/D/M · 230V", gettingThere: "Kathmandu (KTM) · ~12h from London (1 stop)", health: "Altitude on treks — acclimatize" },
  "japan-kyoto": { visa: "Visa-free ~90 days for many", currency: "Japanese yen (JPY)", language: "Japanese", plugs: "Types A/B · 100V", gettingThere: "Osaka Kansai (KIX) · ~12h from London", health: "Very safe; summer heat & humidity" },
  "morocco-marrakech": { visa: "Visa-free ~90 days for many", currency: "Moroccan dirham (MAD)", language: "Arabic & Berber (French common)", plugs: "Types C/E · 220V", gettingThere: "Marrakech (RAK) · ~3.5h from London", health: "Strong sun; standard street awareness" },
  "tanzania-zanzibar": { visa: "Visa required (e-Visa / on arrival)", currency: "Tanzanian shilling (TZS); USD common", language: "Swahili", plugs: "Type G · 230V", gettingThere: "Zanzibar (ZNZ) · ~10h from London (1 stop)", health: "Malaria — prophylaxis & repellent; strong sun" },
  "mexico-yucatan": { visa: "Visa-free up to 180 days for many", currency: "Mexican peso (MXN)", language: "Spanish", plugs: "Types A/B · 127V", gettingThere: "Cancún (CUN) · ~11h from London", health: "Drink bottled water; strong sun; hurricane season Aug–Oct" },
  "india-rajasthan": { visa: "e-Visa required for most", currency: "Indian rupee (INR)", language: "Hindi & English", plugs: "Types C/D/M · 230V", gettingThere: "Jaipur (JAI) via Delhi · ~10h from London", health: "Bottled water; extreme heat Apr–Jun" },
  "turkey-cappadocia": { visa: "Visa-free / e-Visa for many", currency: "Turkish lira (TRY)", language: "Turkish", plugs: "Types C/F · 230V", gettingThere: "Kayseri (ASR) via Istanbul · ~5h from London", health: "Strong sun; cold, snowy winters" },
  "greece-santorini": { visa: "Visa-free 90 days (Schengen) for many", currency: "Euro (EUR)", language: "Greek", plugs: "Types C/F · 230V", gettingThere: "Santorini (JTR) · ~4h from London", health: "Strong sun; steep caldera steps" },
  "south-africa-capetown": { visa: "Visa-free up to 90 days for many", currency: "South African rand (ZAR)", language: "English, Afrikaans & Xhosa", plugs: "Types C/D/M/N · 230V", gettingThere: "Cape Town (CPT) · ~12h from London", health: "Strong sun; petty-theft awareness" },
  "japan-tokyo": { visa: "Visa-free ~90 days for many", currency: "Japanese yen (JPY)", language: "Japanese", plugs: "Types A/B · 100V", gettingThere: "Tokyo (HND/NRT) · ~12h from London", health: "Very safe; hot, humid summers" },
  "japan-hokkaido": { visa: "Visa-free ~90 days for many", currency: "Japanese yen (JPY)", language: "Japanese", plugs: "Types A/B · 100V", gettingThere: "Sapporo (CTS) via Tokyo · ~13h from London", health: "Very safe; severe cold & snow Dec–Mar — dress warm" },
  "japan-okinawa": { visa: "Visa-free ~90 days for many", currency: "Japanese yen (JPY)", language: "Japanese (Okinawan)", plugs: "Types A/B · 100V", gettingThere: "Naha (OKA) via Tokyo · ~15h from London", health: "Strong sun; typhoon awareness Aug–Sep" },
  "costa-rica-arenal": { visa: "Visa-free 90 days for many", currency: "Costa Rican colón (CRC); USD common", language: "Spanish", plugs: "Types A/B · 120V", gettingThere: "San José (SJO) · ~11h from London (1 stop)", health: "Strong sun; dengue in the green season — repellent" },
  "egypt-cairo": { visa: "Visa required (e-Visa / on arrival) for most", currency: "Egyptian pound (EGP)", language: "Arabic", plugs: "Types C/F · 220V", gettingThere: "Cairo (CAI) · ~5h from London", health: "Bottled water only; extreme summer heat; sun protection" },
  "india-agra": { visa: "e-Visa required for most", currency: "Indian rupee (INR)", language: "Hindi & English", plugs: "Types C/D/M · 230V", gettingThere: "Delhi (DEL), ~3–4h by road/train to Agra · ~9h from London", health: "Bottled water; extreme heat Apr–Jun; winter fog Dec–Jan" },
  "france-paris": { visa: "Visa-free 90 days (Schengen) for many", currency: "Euro (EUR)", language: "French", plugs: "Types C/E · 230V", gettingThere: "Paris (CDG/ORY) · ~1.5h flight or 2.5h by train from London", health: "Very safe; watch for pickpockets at busy sights" },
  "italy-rome": { visa: "Visa-free 90 days (Schengen) for many", currency: "Euro (EUR)", language: "Italian", plugs: "Types C/F/L · 230V", gettingThere: "Rome (FCO/CIA) · ~2.5h from London", health: "Summer heat — carry water; pickpockets on transit" },
  "australia-sydney": { visa: "ETA / eVisitor required for most", currency: "Australian dollar (AUD)", language: "English", plugs: "Type I · 230V", gettingThere: "Sydney (SYD) · ~22h from London (1 stop)", health: "Fierce UV — high SPF; swim between the flags" },
  "newzealand-queenstown": { visa: "NZeTA required (visa-free entry) for many", currency: "New Zealand dollar (NZD)", language: "English & Māori", plugs: "Type I · 230V", gettingThere: "Queenstown (ZQN) via Auckland · ~26h from London", health: "Strong alpine UV & sandflies; changeable mountain weather" },
  "philippines-manila": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Manila (MNL) · ~14h from London (1 stop)", health: "Heavy traffic & wet-season flooding; dengue — repellent" },
  "philippines-cebu": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Cebu (CEB) · ~15h from London (1 stop)", health: "Strong sun; dengue — repellent; reef-safe sunscreen" },
  "philippines-boracay": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Caticlan (MPH) via Manila/Cebu · ~17h from London", health: "Strong sun & currents; environmental fee on arrival" },
  "philippines-bohol": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Bohol-Panglao (TAG) via Manila/Cebu · ~17h from London", health: "Strong sun; dengue — repellent" },
  "philippines-siargao": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Siargao (IAO) via Cebu/Manila · ~19h from London", health: "Strong sun & reef cuts; bring cash (few ATMs)" },
  "philippines-banaue": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "~9h by bus from Manila (MNL) · ~14h from London", health: "Cool mountain nights; landslide risk in the wet season" },
  "philippines-dumaguete": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English (Cebuano)", plugs: "Types A/B/C · 220V", gettingThere: "Dumaguete (DGT) via Manila/Cebu · ~18h from London", health: "Strong sun; dengue — repellent; reef-safe sunscreen" },
  "malaysia-kualalumpur": { visa: "Visa-free 90 days for many", currency: "Malaysian ringgit (MYR)", language: "Malay (English widely spoken)", plugs: "Type G · 240V", gettingThere: "Kuala Lumpur (KUL) · ~13h from London", health: "Strong sun; dengue — repellent; tap water best boiled/bottled" },
  "malaysia-penang": { visa: "Visa-free 90 days for many", currency: "Malaysian ringgit (MYR)", language: "Malay, Hokkien & English", plugs: "Type G · 240V", gettingThere: "Penang (PEN) via KL · ~15h from London", health: "Strong sun; dengue — repellent" },
  "malaysia-langkawi": { visa: "Visa-free 90 days for many", currency: "Malaysian ringgit (MYR)", language: "Malay (English widely spoken)", plugs: "Type G · 240V", gettingThere: "Langkawi (LGK) via KL · ~16h from London", health: "Strong sun & currents; reef-safe sunscreen" },
  "malaysia-malacca": { visa: "Visa-free 90 days for many", currency: "Malaysian ringgit (MYR)", language: "Malay & English", plugs: "Type G · 240V", gettingThere: "~2h by bus from KL (KUL) · ~13h from London", health: "Strong sun; dengue — repellent" },
  "malaysia-sabah": { visa: "Visa-free 90 days for many", currency: "Malaysian ringgit (MYR)", language: "Malay & English", plugs: "Type G · 240V", gettingThere: "Kota Kinabalu (BKI) via KL/Singapore · ~16h from London", health: "Malaria in the rural interior — seek advice; leeches on treks; strong sun" },
  "philippines-coron": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Busuanga (USU) via Manila/Cebu · ~18h from London", health: "Strong sun & reef cuts; bring cash (few ATMs)" },
  "philippines-vigan": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Filipino, Ilocano & English", plugs: "Types A/B/C · 220V", gettingThere: "~6–8h by bus from Manila (MNL) · ~14h from London", health: "Strong sun; the heritage core is walkable" },
  "philippines-batanes": { visa: "Visa-free ~30 days for many", currency: "Philippine peso (PHP)", language: "Ivatan, Filipino & English", plugs: "Types A/B/C · 220V", gettingThere: "Basco (BSO) via Manila · ~16h from London", health: "Fierce wind & sun; flights cancel in bad weather — buffer days" },
  "thailand-huahin": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "~3h by road from Bangkok (BKK) · ~11h from London", health: "Strong sun; jellyfish in season; drink bottled water" },
  "mexico-playadelcarmen": { visa: "Visa-free up to 180 days for many", currency: "Mexican peso (MXN)", language: "Spanish", plugs: "Types A/B · 127V", gettingThere: "Cancún (CUN), ~1h by road · ~11h from London", health: "Bottled water; strong sun; hurricane season Aug–Oct; sargassum May–Aug" },
  "thailand-kohphangan": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Ferry from Koh Samui (USM) or Surat Thani · ~14h from London", health: "Strong sun & sea; party & jellyfish awareness" },
  "thailand-kohtao": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Ferry from Koh Samui / Chumphon · ~14h from London", health: "Dive safety; strong sun; reef-safe sunscreen" },
  "thailand-phuket": { visa: "Visa-free 30–60 days for many", currency: "Thai baht (THB)", language: "Thai", plugs: "Types A/B/C · 230V", gettingThere: "Phuket (HKT) · ~13h from London", health: "Strong sun & rip currents in monsoon season" },
  "indonesia-gili": { visa: "Visa on arrival (30 days) for many", currency: "Indonesian rupiah (IDR)", language: "Indonesian (Sasak)", plugs: "Types C/F · 230V", gettingThere: "Fast boat from Bali (DPS) or Lombok (LOP) · ~17h from London", health: "Dengue — repellent; care on scooters; no island ATMs reliable" },
  "cambodia-kohrong": { visa: "e-Visa / visa on arrival", currency: "Riel (KHR); USD widely used", language: "Khmer", plugs: "Types A/C/G · 230V", gettingThere: "Ferry from Sihanoukville (KOS) · ~16h from London", health: "Strong sun; limited medical care — bring basics" },
  "vietnam-phuquoc": { visa: "e-Visa (most); Phú Quốc has visa-free entry", currency: "Vietnamese đồng (VND)", language: "Vietnamese", plugs: "Types A/C/F · 220V", gettingThere: "Phú Quốc (PQC) via Ho Chi Minh City · ~15h from London", health: "Strong sun; jellyfish in season; bottled water" },
  "india-goa": { visa: "e-Visa required for most", currency: "Indian rupee (INR)", language: "Konkani, Hindi & English", plugs: "Types C/D/M · 230V", gettingThere: "Goa (GOI/GOX) via Delhi/Mumbai · ~11h from London", health: "Bottled water; strong sun; monsoon swells Jun–Sep" },
  "maldives-atolls": { visa: "Free visa on arrival (30 days)", currency: "Maldivian rufiyaa (MVR); USD common", language: "Dhivehi (English widely spoken)", plugs: "Types D/G · 230V", gettingThere: "Malé (MLE) · ~10–11h from London", health: "Intense sun; alcohol only at resorts; reef-safe sunscreen" },
  "indonesia-komodo": { visa: "Visa on arrival (30 days) for many", currency: "Indonesian rupiah (IDR)", language: "Indonesian", plugs: "Types C/F · 230V", gettingThere: "Labuan Bajo (LBJ) via Bali · ~19h from London", health: "Intense sun & heat; strong currents on dives; park fees" },
  "indonesia-nusapenida": { visa: "Visa on arrival (30 days) for many", currency: "Indonesian rupiah (IDR)", language: "Indonesian (Balinese)", plugs: "Types C/F · 230V", gettingThere: "Fast boat from Bali (DPS) · ~17h from London", health: "Rough cliff roads & stairs; strong currents; dengue" },
  "frenchpolynesia-borabora": { visa: "Visa-free 90 days for many", currency: "CFP franc (XPF)", language: "French & Tahitian", plugs: "Types A/B/E · 220V", gettingThere: "Bora Bora (BOB) via Tahiti (PPT) · ~22h from London", health: "Intense sun; very high prices — plan a budget" },
  "usa-maui": { visa: "ESTA / visa waiver required for most", currency: "US dollar (USD)", language: "English & Hawaiian", plugs: "Types A/B · 120V", gettingThere: "Kahului (OGG) via US west coast · ~18h from London", health: "Strong sun & ocean currents; respect reef & sacred sites" },
  "puerto-rico-sanjuan": { visa: "No passport needed for US citizens; others need ESTA / visa", currency: "US dollar (USD)", language: "Spanish & English", plugs: "Types A/B · 120V", gettingThere: "San Juan (SJU) · ~4h from Miami, ~9h from London", health: "Strong sun; Zika/dengue — repellent; hurricane season Aug–Oct" },
  "brazil-florianopolis": { visa: "Visa-free ~90 days for many", currency: "Brazilian real (BRL)", language: "Portuguese", plugs: "Types C/N · 127/220V", gettingThere: "Florianópolis (FLN) via São Paulo · ~15h from London", health: "Strong sun; undertow on the eastern beaches" },
  "brazil-curitiba": { visa: "Visa-free ~90 days for many", currency: "Brazilian real (BRL)", language: "Portuguese", plugs: "Types C/N · 127/220V", gettingThere: "Curitiba (CWB) via São Paulo · ~14h from London", health: "Cool highland climate; unpredictable weather — layer up" },
};

for (const region of REGIONS_CORE) {
  if (DAILY_BUDGET[region.id]) region.dailyBudget = DAILY_BUDGET[region.id];
  if (WIKI_TITLE[region.id]) region.wikiTitle = WIKI_TITLE[region.id];
  if (PHOTOS[region.id]) region.photo = PHOTOS[region.id];
  if (TRAVEL_INFO[region.id]) region.info = TRAVEL_INFO[region.id];
}
