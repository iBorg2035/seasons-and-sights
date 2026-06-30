import type {
  CrowdLevel,
  Event,
  MonthClimate,
  MonthlyClimate,
  Region,
  Season,
  TravelInfo,
} from "@/types";
import photos from "@/data/photos.json";
import wikiTitles from "@/data/wiki-titles.json";
import { TOOLKITS } from "@/data/toolkits";

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

export const REGIONS: Region[] = [
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
    sights: [
      { name: "Wat Phra That Doi Suthep", type: "culture", lat: 18.8048, lng: 98.9217, blurb: "Gilded mountaintop temple overlooking the city." },
      { name: "Old City & Wat Chedi Luang", type: "culture", lat: 18.787, lng: 98.986, blurb: "Moated historic quarter dense with temples." },
      { name: "Doi Inthanon National Park", type: "nature", lat: 18.5887, lng: 98.4868, blurb: "Thailand's highest peak, waterfalls and cloud forest." },
      { name: "Elephant sanctuaries (Mae Taeng)", type: "wildlife", lat: 19.235, lng: 98.85, blurb: "Ethical, no-riding elephant refuges north of the city." },
    ],
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
    sights: [
      { name: "Grand Palace & Wat Phra Kaew", type: "culture", lat: 13.75, lng: 100.4915, blurb: "Royal complex housing the Emerald Buddha." },
      { name: "Wat Arun", type: "culture", lat: 13.7437, lng: 100.4889, blurb: "Riverside 'Temple of Dawn' with a porcelain-tiled spire." },
      { name: "Wat Pho", type: "culture", lat: 13.7465, lng: 100.4927, blurb: "Reclining Buddha and the home of Thai massage." },
      { name: "Chatuchak Weekend Market", type: "city", lat: 13.7999, lng: 100.5503, blurb: "Sprawling 15,000-stall weekend market." },
    ],
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
    sights: [
      { name: "Railay Beach", type: "beach", lat: 8.011, lng: 98.8377, blurb: "Cliff-ringed peninsula reachable only by boat." },
      { name: "Phi Phi Islands", type: "beach", lat: 7.7407, lng: 98.7784, blurb: "Limestone karsts and turquoise bays day-trip away." },
      { name: "Ao Nang", type: "beach", lat: 8.0327, lng: 98.821, blurb: "Main beach town and longtail-boat hub." },
      { name: "Emerald Pool & Hot Springs", type: "nature", lat: 7.92, lng: 99.27, blurb: "Jungle spring-fed pools inland from the coast." },
    ],
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
    sights: [
      { name: "Big Buddha (Wat Phra Yai)", type: "culture", lat: 9.5664, lng: 100.0625, blurb: "12m golden Buddha on a causeway islet." },
      { name: "Ang Thong Marine Park", type: "nature", lat: 9.6167, lng: 99.6667, blurb: "42-island archipelago of lagoons and viewpoints." },
      { name: "Chaweng Beach", type: "beach", lat: 9.5333, lng: 100.0625, blurb: "The island's long, lively main beach." },
      { name: "Na Muang Waterfalls", type: "nature", lat: 9.46, lng: 99.99, blurb: "Two jungle falls in the island's interior." },
    ],
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
    sights: [
      { name: "Tegallalang Rice Terraces", type: "nature", lat: -8.4312, lng: 115.2792, blurb: "Sculpted emerald paddies near Ubud." },
      { name: "Uluwatu Temple", type: "culture", lat: -8.8291, lng: 115.0849, blurb: "Clifftop sea temple famed for sunset kecak dance." },
      { name: "Mount Batur sunrise trek", type: "nature", lat: -8.2421, lng: 115.3753, blurb: "Pre-dawn hike up an active volcano." },
      { name: "Ubud Monkey Forest", type: "wildlife", lat: -8.5188, lng: 115.2585, blurb: "Sacred sanctuary of macaques and mossy temples." },
    ],
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
    sights: [
      { name: "Hoi An Ancient Town", type: "culture", lat: 15.877, lng: 108.327, blurb: "Lantern-lit UNESCO trading port, now pedestrianized." },
      { name: "My Son Sanctuary", type: "culture", lat: 15.7639, lng: 108.1244, blurb: "Ruined Cham Hindu temple complex in the hills." },
      { name: "An Bang Beach", type: "beach", lat: 15.91, lng: 108.338, blurb: "Relaxed sandy stretch minutes from the old town." },
      { name: "Marble Mountains", type: "nature", lat: 16.0036, lng: 108.2655, blurb: "Cave temples inside marble outcrops near Da Nang." },
    ],
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
    sights: [
      { name: "Hoan Kiem Lake & Old Quarter", type: "city", lat: 21.0287, lng: 105.8525, blurb: "Lake-side heart of Hanoi's tangled old town." },
      { name: "Ha Long Bay", type: "nature", lat: 20.9101, lng: 107.1839, blurb: "Thousands of limestone karsts in an emerald sea." },
      { name: "Sapa rice terraces", type: "nature", lat: 22.3364, lng: 103.8438, blurb: "Tiered hill-tribe valleys in the far north." },
      { name: "Temple of Literature", type: "culture", lat: 21.0287, lng: 105.8355, blurb: "Vietnam's first university, founded 1070." },
    ],
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
    sights: [
      { name: "War Remnants Museum", type: "culture", lat: 10.7797, lng: 106.6922, blurb: "Unflinching museum of the American War." },
      { name: "Cu Chi Tunnels", type: "culture", lat: 11.1417, lng: 106.4642, blurb: "Vast Viet Cong tunnel network outside the city." },
      { name: "Mekong Delta", type: "nature", lat: 10.0341, lng: 105.7882, blurb: "Floating markets and orchards on the river maze." },
      { name: "Bến Thành Market", type: "city", lat: 10.7723, lng: 106.698, blurb: "Landmark market at the city's bustling core." },
    ],
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
    sights: [
      { name: "Angkor Wat", type: "culture", lat: 13.4125, lng: 103.867, blurb: "The world's largest religious monument at sunrise." },
      { name: "Angkor Thom & Bayon", type: "culture", lat: 13.4413, lng: 103.859, blurb: "Walled royal city of serene stone faces." },
      { name: "Ta Prohm", type: "culture", lat: 13.4348, lng: 103.8891, blurb: "Temple cradled by giant strangler-fig roots." },
      { name: "Tonlé Sap floating villages", type: "nature", lat: 13.1, lng: 103.8, blurb: "Stilt and floating communities on SE Asia's largest lake." },
    ],
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
    sights: [
      { name: "El Nido Big & Small Lagoons", type: "nature", lat: 11.18, lng: 119.4, blurb: "Karst-walled lagoons explored by kayak." },
      { name: "Coron & Kayangan Lake", type: "nature", lat: 12.0, lng: 120.2, blurb: "Crystal lake and WWII wreck-diving to the north." },
      { name: "Puerto Princesa Underground River", type: "nature", lat: 10.1939, lng: 118.9255, blurb: "Navigable cave river, a UNESCO natural wonder." },
      { name: "Nacpan Beach", type: "beach", lat: 11.31, lng: 119.41, blurb: "Four-kilometre twin-beach sweep near El Nido." },
    ],
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
    sights: [
      { name: "Machu Picchu", type: "culture", lat: -13.1631, lng: -72.545, blurb: "The iconic 15th-century Inca citadel." },
      { name: "Sacred Valley & Ollantaytambo", type: "culture", lat: -13.2585, lng: -72.2633, blurb: "Inca terraces, fortresses and markets." },
      { name: "Rainbow Mountain (Vinicunca)", type: "nature", lat: -13.8697, lng: -71.303, blurb: "Mineral-striped ridge at 5,000m." },
      { name: "Sacsayhuamán", type: "culture", lat: -13.5092, lng: -71.9822, blurb: "Megalithic Inca walls above Cusco." },
    ],
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
    sights: [
      { name: "Salar de Uyuni", type: "nature", lat: -20.1338, lng: -67.4891, blurb: "The world's largest salt flat, 10,000 km²." },
      { name: "Isla Incahuasi", type: "nature", lat: -20.2417, lng: -67.6261, blurb: "Cactus-covered island amid the salt sea." },
      { name: "Train Cemetery", type: "culture", lat: -20.4849, lng: -66.827, blurb: "Rusting 19th-century locomotives outside town." },
      { name: "Laguna Colorada", type: "wildlife", lat: -22.19, lng: -67.79, blurb: "Red lagoon dense with flamingos." },
    ],
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
    sights: [
      { name: "Perito Moreno Glacier", type: "nature", lat: -50.4967, lng: -73.0377, blurb: "Advancing glacier that calves into the lake." },
      { name: "Torres del Paine", type: "nature", lat: -50.9423, lng: -73.4068, blurb: "Chile's signature granite-tower trekking park." },
      { name: "Mount Fitz Roy (El Chaltén)", type: "nature", lat: -49.3315, lng: -72.8864, blurb: "Argentina's trekking capital beneath jagged peaks." },
      { name: "Lago Argentino", type: "nature", lat: -50.27, lng: -72.28, blurb: "Glacier-fed turquoise lake fronting El Calafate." },
    ],
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
    sights: [
      { name: "Christ the Redeemer", type: "culture", lat: -22.9519, lng: -43.2105, blurb: "Art-deco statue atop Corcovado mountain." },
      { name: "Sugarloaf Mountain", type: "nature", lat: -22.9492, lng: -43.1545, blurb: "Cable-car granite peak over the bay." },
      { name: "Copacabana Beach", type: "beach", lat: -22.9711, lng: -43.1822, blurb: "The city's famous 4km crescent of sand." },
      { name: "Ipanema Beach", type: "beach", lat: -22.9871, lng: -43.2046, blurb: "Chic beach framed by the Dois Irmãos hills." },
    ],
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
    sights: [
      { name: "Meeting of the Waters", type: "nature", lat: -3.1382, lng: -59.9069, blurb: "Dark Rio Negro meets sandy Solimões unmixed." },
      { name: "Anavilhanas Archipelago", type: "nature", lat: -2.6, lng: -60.7, blurb: "Hundreds of river islands and igapó forest." },
      { name: "Amazon Theatre", type: "culture", lat: -3.1301, lng: -60.0234, blurb: "Belle-époque opera house from the rubber boom." },
      { name: "Janauari Ecological Park", type: "wildlife", lat: -3.23, lng: -60.05, blurb: "Giant water lilies, caimans and pink dolphins." },
    ],
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
    sights: [
      { name: "Walled Old City", type: "culture", lat: 10.4236, lng: -75.5513, blurb: "Colourful colonial streets within stone ramparts." },
      { name: "Castillo San Felipe", type: "culture", lat: 10.422, lng: -75.539, blurb: "Hilltop Spanish fortress with tunnel network." },
      { name: "Rosario Islands", type: "beach", lat: 10.1769, lng: -75.75, blurb: "Coral archipelago for day-trips and snorkeling." },
      { name: "Getsemaní", type: "city", lat: 10.42, lng: -75.547, blurb: "Street-art barrio of plazas and nightlife." },
    ],
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
    sights: [
      { name: "Valle de la Luna", type: "nature", lat: -22.927, lng: -68.279, blurb: "Lunar dunes and salt formations at sunset." },
      { name: "El Tatio Geysers", type: "nature", lat: -22.3333, lng: -68.0103, blurb: "High-altitude geyser field steaming at dawn." },
      { name: "Laguna Cejar", type: "nature", lat: -23.07, lng: -68.2, blurb: "Hypersaline lagoon where you float effortlessly." },
      { name: "ALMA & desert stargazing", type: "nature", lat: -23.0229, lng: -67.7549, blurb: "Among the clearest night skies on the planet." },
    ],
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
    sights: [
      { name: "Charles Darwin Research Station", type: "wildlife", lat: -0.7437, lng: -90.3017, blurb: "Giant-tortoise breeding centre at Puerto Ayora." },
      { name: "Tortuga Bay", type: "beach", lat: -0.7657, lng: -90.336, blurb: "White-sand bay with marine iguanas and rays." },
      { name: "Bartolomé Island", type: "nature", lat: -0.2825, lng: -90.55, blurb: "Pinnacle Rock viewpoint and penguin snorkeling." },
      { name: "Kicker Rock (León Dormido)", type: "wildlife", lat: -0.7894, lng: -89.536, blurb: "Sheer tuff cone with sharks and rays below." },
    ],
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
    sights: [
      { name: "Ksamil Beaches", type: "beach", lat: 39.7672, lng: 20.0006, blurb: "Turquoise coves and tiny islets near the Greek border." },
      { name: "Butrint National Park", type: "culture", lat: 39.7456, lng: 20.0203, blurb: "Greek, Roman, and Venetian ruins on a wooded peninsula." },
      { name: "Blue Eye (Syri i Kaltër)", type: "nature", lat: 39.9242, lng: 20.1906, blurb: "Deep-blue karst spring bubbling up through the forest." },
      { name: "Gjirokastër Old Town", type: "culture", lat: 40.0758, lng: 20.1389, blurb: "UNESCO 'city of stone' of Ottoman houses and a hilltop castle." },
    ],
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
    sights: [
      { name: "Kotor Old Town", type: "culture", lat: 42.4247, lng: 18.7712, blurb: "Walled medieval port below a dramatic fjord-like bay." },
      { name: "Sveti Stefan", type: "beach", lat: 42.2553, lng: 18.8917, blurb: "Iconic fortified islet on the Budva Riviera." },
      { name: "Budva Old Town", type: "culture", lat: 42.2786, lng: 18.8389, blurb: "Venetian-walled town and the coast's nightlife hub." },
      { name: "Durmitor National Park", type: "nature", lat: 43.1395, lng: 19.048, blurb: "Glacial lakes, peaks, and the deep Tara River canyon." },
    ],
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
    sights: [
      { name: "Göreme Open-Air Museum", type: "culture", lat: 38.6431, lng: 34.8456, blurb: "Rock-cut churches with Byzantine frescoes." },
      { name: "Hot-air balloon fields", type: "nature", lat: 38.6425, lng: 34.829, blurb: "Sunrise balloons over the fairy chimneys." },
      { name: "Derinkuyu Underground City", type: "culture", lat: 38.3739, lng: 34.735, blurb: "Eight-level subterranean city carved in tuff." },
      { name: "Uçhisar Castle", type: "culture", lat: 38.63, lng: 34.806, blurb: "Tallest fairy chimney, with valley views." },
    ],
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
    sights: [
      { name: "Oia village & sunset", type: "city", lat: 36.4618, lng: 25.3753, blurb: "Whitewashed clifftop village famed for sunsets." },
      { name: "Fira", type: "city", lat: 36.4167, lng: 25.4333, blurb: "Caldera-rim capital of cafés and views." },
      { name: "Akrotiri", type: "culture", lat: 36.3517, lng: 25.4036, blurb: "Bronze-Age 'Minoan Pompeii' ruins." },
      { name: "Red Beach", type: "beach", lat: 36.3489, lng: 25.3947, blurb: "Dramatic red-cliff volcanic cove." },
    ],
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
    sights: [
      { name: "Tulum Ruins", type: "culture", lat: 20.2148, lng: -87.429, blurb: "Clifftop Maya ruins above a turquoise beach." },
      { name: "Chichén Itzá", type: "culture", lat: 20.6843, lng: -88.5678, blurb: "The great Maya pyramid of El Castillo." },
      { name: "Cenote Dos Ojos", type: "nature", lat: 20.3253, lng: -87.3899, blurb: "Crystalline freshwater sinkhole for swimming/diving." },
      { name: "Cozumel reefs", type: "beach", lat: 20.423, lng: -86.9223, blurb: "World-class snorkeling and dive sites." },
    ],
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
    sights: [
      { name: "Amber Fort", type: "culture", lat: 26.9855, lng: 75.8513, blurb: "Hilltop fort-palace above Jaipur." },
      { name: "Hawa Mahal", type: "culture", lat: 26.9239, lng: 75.8267, blurb: "Jaipur's honeycomb 'Palace of Winds'." },
      { name: "City Palace, Udaipur", type: "culture", lat: 24.5764, lng: 73.6835, blurb: "Lakeside palace complex in the 'City of Lakes'." },
      { name: "Ranthambore National Park", type: "wildlife", lat: 26.0173, lng: 76.5026, blurb: "Tiger reserve among ruined forts." },
    ],
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
    sights: [
      { name: "Sigiriya Rock Fortress", type: "culture", lat: 7.957, lng: 80.7603, blurb: "Ancient palace atop a sheer granite monolith." },
      { name: "Temple of the Sacred Tooth", type: "culture", lat: 7.2936, lng: 80.6413, blurb: "Kandy's revered Buddhist relic shrine." },
      { name: "Ella & Nine Arch Bridge", type: "nature", lat: 6.8667, lng: 81.0466, blurb: "Tea-country hills, waterfalls and a colonial viaduct." },
      { name: "Yala National Park", type: "wildlife", lat: 6.3735, lng: 81.5089, blurb: "Leopards, elephants and lagoon birdlife." },
    ],
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
    sights: [
      { name: "Kathmandu Durbar Square", type: "culture", lat: 27.7045, lng: 85.307, blurb: "Newari palaces and temples in the old royal plaza." },
      { name: "Boudhanath Stupa", type: "culture", lat: 27.7215, lng: 85.362, blurb: "One of the world's largest Buddhist stupas." },
      { name: "Pokhara & Annapurna", type: "nature", lat: 28.2096, lng: 83.9856, blurb: "Lakeside gateway to the Annapurna treks." },
      { name: "Chitwan National Park", type: "wildlife", lat: 27.5291, lng: 84.454, blurb: "Lowland jungle of rhinos, tigers and gharials." },
    ],
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
    sights: [
      { name: "Fushimi Inari Shrine", type: "culture", lat: 34.9671, lng: 135.7727, blurb: "Thousands of vermilion torii up a wooded hill." },
      { name: "Arashiyama Bamboo Grove", type: "nature", lat: 35.0094, lng: 135.6737, blurb: "Towering bamboo paths west of the city." },
      { name: "Kinkaku-ji (Golden Pavilion)", type: "culture", lat: 35.0394, lng: 135.7292, blurb: "Gold-leaf temple mirrored in its pond." },
      { name: "Nara deer park", type: "wildlife", lat: 34.6851, lng: 135.843, blurb: "Free-roaming sacred deer among ancient temples." },
    ],
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
    sights: [
      { name: "Sensō-ji, Asakusa", type: "culture", lat: 35.7148, lng: 139.7967, blurb: "Tokyo's oldest temple and bustling Nakamise lane." },
      { name: "Shibuya Crossing", type: "city", lat: 35.6595, lng: 139.7004, blurb: "The world's busiest pedestrian scramble." },
      { name: "Meiji Shrine", type: "culture", lat: 35.6764, lng: 139.6993, blurb: "Forested Shinto shrine in the heart of the city." },
      { name: "Mt Fuji & Hakone", type: "nature", lat: 35.3606, lng: 138.7274, blurb: "Iconic volcano and hot-spring country day-trip." },
    ],
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
    sights: [
      { name: "Odori Park, Sapporo", type: "city", lat: 43.0606, lng: 141.3469, blurb: "City's central park; Snow Festival home." },
      { name: "Niseko", type: "nature", lat: 42.8048, lng: 140.6874, blurb: "Legendary powder-snow ski resort." },
      { name: "Furano lavender fields", type: "nature", lat: 43.3416, lng: 142.383, blurb: "Rolling purple fields in midsummer." },
      { name: "Shiretoko National Park", type: "wildlife", lat: 44.09, lng: 145.1, blurb: "Wild UNESCO peninsula of bears and sea eagles." },
    ],
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
    sights: [
      { name: "Shuri Castle, Naha", type: "culture", lat: 26.217, lng: 127.7195, blurb: "Ryūkyū Kingdom palace (under restoration)." },
      { name: "Churaumi Aquarium", type: "wildlife", lat: 26.694, lng: 127.8779, blurb: "Giant tank of whale sharks and manta rays." },
      { name: "Kerama Islands", type: "beach", lat: 26.19, lng: 127.3, blurb: "'Kerama blue' reefs for snorkeling & diving." },
      { name: "Kabira Bay, Ishigaki", type: "beach", lat: 24.4539, lng: 124.1456, blurb: "Postcard turquoise bay in the far south." },
    ],
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
    sights: [
      { name: "Jemaa el-Fnaa", type: "city", lat: 31.6258, lng: -7.9891, blurb: "The medina's chaotic, theatrical main square." },
      { name: "Majorelle Garden", type: "nature", lat: 31.6417, lng: -8.0033, blurb: "Cobalt-blue botanical retreat in the city." },
      { name: "Atlas Mountains & Imlil", type: "nature", lat: 31.1356, lng: -7.9192, blurb: "Berber villages and trailheads up Mt Toubkal." },
      { name: "Aït Benhaddou", type: "culture", lat: 31.047, lng: -7.1318, blurb: "Fortified earthen ksar on the old caravan route." },
    ],
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
    sights: [
      { name: "Stone Town", type: "culture", lat: -6.1632, lng: 39.1889, blurb: "Labyrinthine UNESCO old town of Swahili history." },
      { name: "Nungwi Beach", type: "beach", lat: -5.726, lng: 39.296, blurb: "Powder sand and dhows at the island's north tip." },
      { name: "Jozani Forest", type: "wildlife", lat: -6.27, lng: 39.41, blurb: "Home of the endemic red colobus monkey." },
      { name: "Prison Island", type: "nature", lat: -6.12, lng: 39.18, blurb: "Giant tortoises a short boat ride offshore." },
    ],
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
    sights: [
      { name: "Table Mountain", type: "nature", lat: -33.9628, lng: 18.4098, blurb: "Flat-topped peak by cableway over the city." },
      { name: "Cape of Good Hope", type: "nature", lat: -34.3568, lng: 18.474, blurb: "Dramatic cliffs at the peninsula's tip." },
      { name: "Robben Island", type: "culture", lat: -33.8076, lng: 18.3712, blurb: "Mandela's prison island, now a museum." },
      { name: "Boulders Beach", type: "wildlife", lat: -34.1976, lng: 18.451, blurb: "Beach colony of African penguins." },
    ],
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
    sights: [
      { name: "Arenal Volcano", type: "nature", lat: 10.463, lng: -84.703, blurb: "Near-perfect cone with hot springs at its base." },
      { name: "Monteverde Cloud Forest", type: "nature", lat: 10.3009, lng: -84.8074, blurb: "Misty canopy reserve laced with hanging bridges." },
      { name: "Manuel Antonio National Park", type: "wildlife", lat: 9.392, lng: -84.137, blurb: "Rainforest meets the Pacific; sloths and monkeys." },
      { name: "La Fortuna Waterfall", type: "nature", lat: 10.449, lng: -84.668, blurb: "A 70m cascade into a jungle pool." },
    ],
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
    sights: [
      { name: "Pyramids of Giza & the Sphinx", type: "culture", lat: 29.9792, lng: 31.1342, blurb: "The last surviving ancient wonder, on Cairo's edge." },
      { name: "Karnak Temple, Luxor", type: "culture", lat: 25.7188, lng: 32.6573, blurb: "Vast hall of towering columns by the Nile." },
      { name: "Valley of the Kings", type: "culture", lat: 25.7402, lng: 32.6014, blurb: "Rock-cut royal tombs, incl. Tutankhamun's." },
      { name: "The Egyptian Museum", type: "culture", lat: 30.0478, lng: 31.2336, blurb: "Pharaonic treasures in central Cairo." },
    ],
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
    sights: [
      { name: "Taj Mahal", type: "culture", lat: 27.1751, lng: 78.0421, blurb: "The marble mausoleum, unmissable at sunrise." },
      { name: "Agra Fort", type: "culture", lat: 27.1795, lng: 78.0211, blurb: "Red-sandstone Mughal fortress city." },
      { name: "Red Fort & Old Delhi", type: "culture", lat: 28.6562, lng: 77.241, blurb: "Mughal walled palace amid Delhi's bazaars." },
      { name: "Fatehpur Sikri", type: "culture", lat: 27.094, lng: 77.661, blurb: "Abandoned red-sandstone Mughal capital." },
    ],
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
    sights: [
      { name: "Eiffel Tower", type: "city", lat: 48.8584, lng: 2.2945, blurb: "The iron icon over the Champ de Mars." },
      { name: "The Louvre", type: "culture", lat: 48.8606, lng: 2.3376, blurb: "The world's most-visited museum." },
      { name: "Notre-Dame & Île de la Cité", type: "culture", lat: 48.853, lng: 2.3499, blurb: "Gothic cathedral on the Seine." },
      { name: "Montmartre & Sacré-Cœur", type: "city", lat: 48.8867, lng: 2.3431, blurb: "Hilltop artists' quarter and white basilica." },
    ],
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
    sights: [
      { name: "Colosseum", type: "culture", lat: 41.8902, lng: 12.4922, blurb: "The vast ancient amphitheatre." },
      { name: "Vatican: St Peter's & Sistine Chapel", type: "culture", lat: 41.9022, lng: 12.4539, blurb: "Michelangelo's ceiling and the great basilica." },
      { name: "Roman Forum & Palatine Hill", type: "culture", lat: 41.8925, lng: 12.4853, blurb: "The ruined heart of ancient Rome." },
      { name: "Trevi Fountain & Pantheon", type: "culture", lat: 41.9009, lng: 12.4833, blurb: "Baroque fountain and the domed temple." },
    ],
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
    sights: [
      { name: "Sydney Opera House", type: "culture", lat: -33.8568, lng: 151.2153, blurb: "The sail-shelled icon on the harbour." },
      { name: "Sydney Harbour Bridge", type: "city", lat: -33.8523, lng: 151.2108, blurb: "Walk or climb the 'Coathanger'." },
      { name: "Bondi Beach & Coastal Walk", type: "beach", lat: -33.8908, lng: 151.2743, blurb: "Famous surf beach and clifftop path to Coogee." },
      { name: "Blue Mountains", type: "nature", lat: -33.7, lng: 150.3, blurb: "Eucalyptus canyons and the Three Sisters (day trip)." },
    ],
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
    sights: [
      { name: "Lake Wakatipu", type: "nature", lat: -45.03, lng: 168.66, blurb: "Z-shaped alpine lake ringed by peaks." },
      { name: "The Remarkables", type: "nature", lat: -45.05, lng: 168.82, blurb: "Dramatic ski range above the town." },
      { name: "Milford Sound", type: "nature", lat: -44.671, lng: 167.925, blurb: "Sheer fiord cliffs and waterfalls (day trip)." },
      { name: "Skyline Gondola & Bob's Peak", type: "city", lat: -45.027, lng: 168.658, blurb: "Panoramic views and the luge above town." },
    ],
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
    sights: [
      { name: "Intramuros & Fort Santiago", type: "culture", lat: 14.5906, lng: 120.9747, blurb: "Spanish-era walled city and riverside fort." },
      { name: "San Agustin Church", type: "culture", lat: 14.589, lng: 120.9747, blurb: "UNESCO Baroque church, the country's oldest." },
      { name: "Rizal Park", type: "city", lat: 14.5826, lng: 120.9787, blurb: "Historic central park and national monument." },
      { name: "Binondo (Chinatown)", type: "city", lat: 14.6, lng: 120.975, blurb: "The world's oldest Chinatown — a street-food haven." },
    ],
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
    sights: [
      { name: "Kawasan Falls", type: "nature", lat: 9.7986, lng: 123.376, blurb: "Turquoise tiered falls and canyoneering." },
      { name: "Oslob whale sharks", type: "wildlife", lat: 9.4622, lng: 123.38, blurb: "Snorkel beside gentle whale sharks." },
      { name: "Moalboal sardine run", type: "wildlife", lat: 9.949, lng: 123.396, blurb: "Vast sardine shoals just off the shore." },
      { name: "Magellan's Cross & Basilica", type: "culture", lat: 10.2937, lng: 123.9018, blurb: "Where Christianity reached the islands in 1521." },
    ],
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
    sights: [
      { name: "White Beach", type: "beach", lat: 11.9646, lng: 121.9269, blurb: "Four kilometres of powder-white sand." },
      { name: "Puka Shell Beach", type: "beach", lat: 11.993, lng: 121.921, blurb: "Quieter, shell-strewn northern beach." },
      { name: "Willy's Rock", type: "nature", lat: 11.968, lng: 121.923, blurb: "Iconic volcanic rock shrine off White Beach." },
      { name: "Island-hopping & Crystal Cove", type: "nature", lat: 11.95, lng: 121.91, blurb: "Snorkel stops and tiny island coves." },
    ],
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
    sights: [
      { name: "Chocolate Hills", type: "nature", lat: 9.828, lng: 124.143, blurb: "1,200+ symmetrical hills that brown in dry season." },
      { name: "Tarsier Sanctuary", type: "wildlife", lat: 9.684, lng: 123.9, blurb: "The tiny, saucer-eyed tarsier primate." },
      { name: "Alona Beach, Panglao", type: "beach", lat: 9.548, lng: 123.775, blurb: "Lively white-sand beach and dive base." },
      { name: "Loboc River cruise", type: "nature", lat: 9.637, lng: 124.029, blurb: "Lunch cruise through jungle riverbanks." },
    ],
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
    sights: [
      { name: "Cloud 9", type: "nature", lat: 9.812, lng: 126.166, blurb: "World-class reef break with a viewing boardwalk." },
      { name: "Sugba Lagoon", type: "nature", lat: 9.93, lng: 125.97, blurb: "Jade lagoon for paddleboarding and diving." },
      { name: "Magpupungko Rock Pools", type: "nature", lat: 9.923, lng: 126.109, blurb: "Tidal rock pools revealed at low tide." },
      { name: "Naked, Daku & Guyam Islands", type: "beach", lat: 9.84, lng: 126.15, blurb: "The classic three-island hopping day trip." },
    ],
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
    sights: [
      { name: "Banaue Rice Terraces", type: "culture", lat: 16.929, lng: 121.057, blurb: "The 2,000-year-old 'Stairway to the Sky'." },
      { name: "Batad Amphitheatre Terraces", type: "nature", lat: 16.932, lng: 121.13, blurb: "A cascade of terraces around a village bowl." },
      { name: "Tappiya Falls", type: "nature", lat: 16.929, lng: 121.138, blurb: "Tall waterfall below the Batad terraces." },
      { name: "Hapao Hot Springs", type: "nature", lat: 16.88, lng: 121.03, blurb: "Riverside springs amid the terraces." },
    ],
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
    sights: [
      { name: "Apo Island", type: "wildlife", lat: 9.075, lng: 123.27, blurb: "Marine sanctuary famed for sea turtles and reefs." },
      { name: "Rizal Boulevard", type: "city", lat: 9.3081, lng: 123.3083, blurb: "Seaside promenade lined with cafés." },
      { name: "Casaroro Falls", type: "nature", lat: 9.2667, lng: 123.2, blurb: "Tall jungle waterfall reached by a steep descent." },
      { name: "Twin Lakes (Balinsasayao)", type: "nature", lat: 9.3667, lng: 123.1667, blurb: "Two crater lakes ringed by rainforest." },
    ],
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
    sights: [
      { name: "Petronas Twin Towers", type: "city", lat: 3.1578, lng: 101.7117, blurb: "The iconic 452m steel-clad twin towers." },
      { name: "Batu Caves", type: "culture", lat: 3.2379, lng: 101.684, blurb: "Limestone cave temples up 272 rainbow steps." },
      { name: "Bukit Bintang & KL Tower", type: "city", lat: 3.1528, lng: 101.7039, blurb: "Observation tower above the buzzing food and shopping district." },
      { name: "Merdeka Square & old quarter", type: "culture", lat: 3.1478, lng: 101.6953, blurb: "Colonial-era square where independence was declared." },
    ],
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
    sights: [
      { name: "George Town heritage & street art", type: "culture", lat: 5.4145, lng: 100.338, blurb: "UNESCO old town of shophouses and murals." },
      { name: "Kek Lok Si Temple", type: "culture", lat: 5.3997, lng: 100.273, blurb: "Hilltop temple with a giant Guanyin statue." },
      { name: "Penang Hill", type: "nature", lat: 5.425, lng: 100.268, blurb: "Funicular to cool summit views over the strait." },
      { name: "Gurney Drive hawker food", type: "city", lat: 5.438, lng: 100.309, blurb: "Seafront promenade and famous hawker stalls." },
    ],
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
    sights: [
      { name: "Sky Bridge & Cable Car", type: "nature", lat: 6.385, lng: 99.67, blurb: "Curved bridge high over the rainforest canopy." },
      { name: "Pantai Cenang", type: "beach", lat: 6.287, lng: 99.727, blurb: "The main beach strip for sunsets and watersports." },
      { name: "Kilim Geoforest Park", type: "nature", lat: 6.42, lng: 99.86, blurb: "Mangrove cruises past eagles and limestone karsts." },
      { name: "Pulau Payar Marine Park", type: "beach", lat: 6.05, lng: 100.04, blurb: "Snorkel and dive day-trip to the reef." },
    ],
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
    sights: [
      { name: "A Famosa & St Paul's Hill", type: "culture", lat: 2.1917, lng: 102.25, blurb: "Portuguese fort ruins above the old town." },
      { name: "Jonker Street", type: "city", lat: 2.1955, lng: 102.247, blurb: "Chinatown's antique shops and weekend night market." },
      { name: "Christ Church & Dutch Square", type: "culture", lat: 2.1944, lng: 102.2486, blurb: "The salmon-red Dutch colonial heart." },
      { name: "Melaka River cruise", type: "nature", lat: 2.196, lng: 102.248, blurb: "Boat ride past muralled riverside houses." },
    ],
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
    sights: [
      { name: "Mount Kinabalu", type: "nature", lat: 6.075, lng: 116.5583, blurb: "Southeast Asia's highest peak — a two-day climb." },
      { name: "Sipadan & Mabul diving", type: "wildlife", lat: 4.115, lng: 118.628, blurb: "World-class diving with turtles and sharks (via Semporna)." },
      { name: "Tunku Abdul Rahman Marine Park", type: "beach", lat: 5.97, lng: 116.005, blurb: "Island-hopping reefs just off the city." },
      { name: "Kinabatangan River wildlife", type: "wildlife", lat: 5.415, lng: 118.0, blurb: "Orangutans and proboscis monkeys along the river." },
    ],
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
    sights: [
      { name: "Kayangan Lake", type: "nature", lat: 11.99, lng: 120.21, blurb: "The Philippines' cleanest lake, framed by karst." },
      { name: "Twin Lagoon", type: "nature", lat: 12.015, lng: 120.23, blurb: "Swim between two lagoons through a limestone gap." },
      { name: "WWII shipwreck dives", type: "wildlife", lat: 12.05, lng: 120.22, blurb: "Japanese wrecks now teeming with marine life." },
      { name: "Barracuda Lake", type: "nature", lat: 11.995, lng: 120.225, blurb: "Eerie thermocline lake popular with divers." },
    ],
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
    sights: [
      { name: "Calle Crisologo", type: "culture", lat: 17.5747, lng: 120.3869, blurb: "Cobblestone street of preserved colonial houses." },
      { name: "Vigan Cathedral & Plaza Salcedo", type: "culture", lat: 17.574, lng: 120.388, blurb: "Baroque cathedral on the historic plaza." },
      { name: "Bantay Bell Tower", type: "culture", lat: 17.587, lng: 120.387, blurb: "Hilltop watchtower with views over the town." },
      { name: "Burnay pottery & Hidden Garden", type: "city", lat: 17.58, lng: 120.4, blurb: "Traditional jar workshops and garden eateries." },
    ],
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
    sights: [
      { name: "Marlboro Hills (Racuh a Payaman)", type: "nature", lat: 20.4, lng: 121.95, blurb: "Rolling green pastures meeting the sea." },
      { name: "Basco Lighthouse", type: "culture", lat: 20.456, lng: 121.969, blurb: "Clifftop lighthouse with sweeping island views." },
      { name: "Sabtang Island stone houses", type: "culture", lat: 20.33, lng: 121.86, blurb: "Traditional Ivatan stone villages." },
      { name: "Valugan Boulder Beach", type: "nature", lat: 20.46, lng: 122.01, blurb: "A beach of smooth volcanic boulders." },
    ],
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
    sights: [
      { name: "Hua Hin Beach & Pier", type: "beach", lat: 12.5684, lng: 99.9612, blurb: "Long sandy resort beach with the old jetty." },
      { name: "Hua Hin Railway Station", type: "culture", lat: 12.568, lng: 99.958, blurb: "Thailand's prettiest station, with a royal pavilion." },
      { name: "Phraya Nakhon Cave", type: "nature", lat: 12.2, lng: 99.9667, blurb: "Cave pavilion lit by a dramatic sky hole." },
      { name: "Cicada & night markets", type: "city", lat: 12.53, lng: 99.97, blurb: "Art-and-food night markets along the coast." },
    ],
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
    sights: [
      { name: "Quinta Avenida (5th Ave)", type: "city", lat: 20.6275, lng: -87.078, blurb: "Pedestrian avenue of shops, bars and restaurants." },
      { name: "Cozumel reefs", type: "wildlife", lat: 20.423, lng: -86.9223, blurb: "World-class diving and snorkelling off the island." },
      { name: "Cenotes (Dos Ojos)", type: "nature", lat: 20.32, lng: -87.39, blurb: "Crystal freshwater sinkholes to swim and dive." },
      { name: "Tulum ruins", type: "culture", lat: 20.215, lng: -87.429, blurb: "Clifftop Maya ruins above a turquoise beach." },
    ],
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
    sights: [
      { name: "Haad Rin (Full Moon Party)", type: "beach", lat: 9.676, lng: 100.068, blurb: "Beach famous for its monthly full-moon party." },
      { name: "Bottle Beach (Haad Khuat)", type: "beach", lat: 9.79, lng: 100.03, blurb: "Secluded cove reached by boat or jungle trail." },
      { name: "Than Sadet Waterfall", type: "nature", lat: 9.75, lng: 100.06, blurb: "Jungle falls with royal-inscription rocks." },
      { name: "Sail Rock (Hin Bai)", type: "wildlife", lat: 9.85, lng: 100.1, blurb: "Granite pinnacle dive site, occasional whale sharks." },
    ],
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
    sights: [
      { name: "Sairee Beach", type: "beach", lat: 10.097, lng: 99.835, blurb: "The main beach strip and dive-school hub." },
      { name: "Koh Nang Yuan", type: "beach", lat: 10.115, lng: 99.815, blurb: "Triple islet joined by a sandbar viewpoint." },
      { name: "Shark Bay (Aow Leuk)", type: "wildlife", lat: 10.06, lng: 99.845, blurb: "Snorkel with blacktip reef sharks." },
      { name: "John-Suwan Viewpoint", type: "nature", lat: 10.058, lng: 99.84, blurb: "Boulder climb to twin-bay views." },
    ],
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
    sights: [
      { name: "Patong Beach", type: "beach", lat: 7.896, lng: 98.296, blurb: "The liveliest beach and nightlife strip." },
      { name: "Old Phuket Town", type: "culture", lat: 7.884, lng: 98.388, blurb: "Sino-Portuguese shophouses and cafés." },
      { name: "Big Buddha", type: "culture", lat: 7.828, lng: 98.312, blurb: "A 45m marble Buddha over the island." },
      { name: "Phi Phi Islands & Maya Bay", type: "nature", lat: 7.679, lng: 98.766, blurb: "Iconic limestone bays, a day-trip away." },
    ],
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
    sights: [
      { name: "Gili Trawangan", type: "beach", lat: -8.35, lng: 116.04, blurb: "Car-free island of beaches and bars." },
      { name: "Gili Meno & Air snorkeling", type: "wildlife", lat: -8.355, lng: 116.06, blurb: "Turtles and reefs off the quieter Gilis." },
      { name: "Mount Rinjani", type: "nature", lat: -8.411, lng: 116.457, blurb: "Volcano trek to a crater lake (Lombok)." },
      { name: "Kuta Lombok beaches", type: "beach", lat: -8.882, lng: 116.279, blurb: "Surf and white-sand bays in the south." },
    ],
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
    sights: [
      { name: "Long Beach (Sok San)", type: "beach", lat: 10.66, lng: 103.2, blurb: "Seven kilometres of powder-white sand." },
      { name: "Saracen Bay (Koh Rong Sanloem)", type: "beach", lat: 10.61, lng: 103.32, blurb: "Calm turquoise bay on the sister island." },
      { name: "Bioluminescent plankton", type: "nature", lat: 10.66, lng: 103.23, blurb: "Glowing night swims in the sea." },
      { name: "Coconut & Lonely Beach", type: "beach", lat: 10.7, lng: 103.21, blurb: "Quiet hammock-and-bungalow coves." },
    ],
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
    sights: [
      { name: "Sao Beach (Bãi Sao)", type: "beach", lat: 10.05, lng: 104.03, blurb: "A crescent of white sand and clear water." },
      { name: "Phú Quốc National Park", type: "nature", lat: 10.36, lng: 104.0, blurb: "Jungle, streams and pepper farms." },
      { name: "Hòn Thơm cable car", type: "city", lat: 10.02, lng: 104.02, blurb: "The world's longest sea-crossing cable car." },
      { name: "Dinh Cậu Night Market", type: "city", lat: 10.22, lng: 103.96, blurb: "Seafood and stalls in Dương Đông town." },
    ],
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
    sights: [
      { name: "Palolem Beach", type: "beach", lat: 15.01, lng: 74.023, blurb: "Palm-fringed crescent in the quieter south." },
      { name: "Baga & Anjuna", type: "beach", lat: 15.56, lng: 73.75, blurb: "Lively north-Goa beaches and flea markets." },
      { name: "Old Goa churches", type: "culture", lat: 15.5, lng: 73.912, blurb: "UNESCO Basilica of Bom Jesus." },
      { name: "Dudhsagar Falls", type: "nature", lat: 15.314, lng: 74.314, blurb: "A four-tier jungle waterfall." },
    ],
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
    sights: [
      { name: "Overwater villas", type: "city", lat: 3.2, lng: 73.22, blurb: "The classic stilted bungalows over the lagoon." },
      { name: "House-reef snorkeling", type: "wildlife", lat: 3.2, lng: 73.221, blurb: "Coral reefs right off the villa steps." },
      { name: "Manta & whale-shark dives", type: "wildlife", lat: 3.61, lng: 72.93, blurb: "Baa Atoll's plankton-rich channels." },
      { name: "Malé & local islands", type: "culture", lat: 4.175, lng: 73.509, blurb: "The capital and budget guesthouse islands." },
    ],
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
    sights: [
      { name: "Komodo dragons", type: "wildlife", lat: -8.55, lng: 119.45, blurb: "The world's largest lizards in the wild." },
      { name: "Padar Island viewpoint", type: "nature", lat: -8.65, lng: 119.58, blurb: "The iconic three-bay panorama." },
      { name: "Pink Beach", type: "beach", lat: -8.54, lng: 119.62, blurb: "Coral-tinted pink sand." },
      { name: "Manta Point diving", type: "wildlife", lat: -8.6, lng: 119.65, blurb: "Drift dives among manta rays." },
    ],
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
    sights: [
      { name: "Kelingking Beach", type: "nature", lat: -8.752, lng: 115.47, blurb: "The T-Rex-shaped cliff over a hidden cove." },
      { name: "Angel's Billabong & Broken Beach", type: "nature", lat: -8.728, lng: 115.456, blurb: "Natural infinity pool and sea arch." },
      { name: "Crystal Bay", type: "beach", lat: -8.72, lng: 115.45, blurb: "Snorkel-and-sunset bay; mola-mola in season." },
      { name: "Atuh Beach", type: "beach", lat: -8.745, lng: 115.62, blurb: "Cliff-ringed eastern cove." },
    ],
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
    sights: [
      { name: "Mount Otemanu", type: "nature", lat: -16.51, lng: -151.74, blurb: "Volcanic peak over the turquoise lagoon." },
      { name: "Lagoon & coral gardens", type: "wildlife", lat: -16.5, lng: -151.74, blurb: "Snorkel with rays and reef sharks." },
      { name: "Matira Beach", type: "beach", lat: -16.54, lng: -151.76, blurb: "The island's best public white-sand beach." },
      { name: "Overwater bungalows", type: "city", lat: -16.5, lng: -151.73, blurb: "The classic Polynesian stilted villas." },
    ],
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
    sights: [
      { name: "Road to Hāna", type: "nature", lat: 20.76, lng: -156.0, blurb: "Cliff-hugging drive past waterfalls." },
      { name: "Haleakalā sunrise", type: "nature", lat: 20.71, lng: -156.25, blurb: "Sunrise above the clouds on the volcano." },
      { name: "Wailea & Mākena beaches", type: "beach", lat: 20.65, lng: -156.44, blurb: "Golden leeward beaches and snorkeling." },
      { name: "Whale watching (Maui Nui)", type: "wildlife", lat: 20.79, lng: -156.5, blurb: "Humpbacks close to shore in winter." },
    ],
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
    sights: [
      { name: "Old San Juan & El Morro", type: "culture", lat: 18.4707, lng: -66.1239, blurb: "Colorful colonial streets and a 16th-century clifftop fortress." },
      { name: "El Yunque Rainforest", type: "nature", lat: 18.2955, lng: -65.7866, blurb: "The only tropical rainforest in the US National Forest System." },
      { name: "Flamenco Beach, Culebra", type: "beach", lat: 18.327, lng: -65.572, blurb: "Consistently ranked among the world's best beaches." },
      { name: "Bioluminescent Bay, Vieques", type: "nature", lat: 18.094, lng: -65.494, blurb: "Kayak through glowing microorganisms at night." },
    ],
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
    sights: [
      { name: "Joaquina Beach & dunes", type: "beach", lat: -27.63, lng: -48.45, blurb: "Surf beach backed by giant sand dunes." },
      { name: "Lagoinha do Leste", type: "beach", lat: -27.77, lng: -48.49, blurb: "Secluded beach reached by a jungle trail." },
      { name: "Santo Antônio de Lisboa", type: "culture", lat: -27.51, lng: -48.52, blurb: "Azorean fishing village with seafood restaurants on the bay." },
      { name: "Barra da Lagoa", type: "beach", lat: -27.57, lng: -48.42, blurb: "Laid-back village, canal swimming, and a coastal trail." },
    ],
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
    sights: [
      { name: "Jardim Botânico", type: "nature", lat: -25.4422, lng: -49.2387, blurb: "Art-nouveau greenhouse and manicured gardens." },
      { name: "Serra do Mar scenic train", type: "nature", lat: -25.42, lng: -49.08, blurb: "Historic railway through Atlantic rainforest to the coast." },
      { name: "Óscar Niemeyer Museum", type: "culture", lat: -25.41, lng: -49.267, blurb: "The 'Eye' — Niemeyer's striking modern art museum." },
      { name: "Vila Velha State Park", type: "nature", lat: -25.25, lng: -50.08, blurb: "Sandstone pillars and a sinkhole crater, ~1.5h from the city." },
    ],
  },
];

// Marquee festivals & events, keyed by region id and attached below. Kept
// separate so the region definitions stay focused on climate + sights.
const EVENTS: Record<string, { name: string; month: number; blurb: string }[]> =
  {
    "thailand-chiangmai": [
      { name: "Yi Peng & Loy Krathong", month: 11, blurb: "Thousands of paper lanterns released into the night sky." },
      { name: "Songkran", month: 4, blurb: "Thai New Year — the nationwide water-fight festival." },
    ],
    "thailand-bangkok": [
      { name: "Songkran", month: 4, blurb: "Citywide water fights for Thai New Year." },
      { name: "Loy Krathong", month: 11, blurb: "Floating candle-lit offerings on the rivers." },
    ],
    "indonesia-bali": [
      { name: "Nyepi (Day of Silence)", month: 3, blurb: "The island shuts down completely for Balinese New Year." },
    ],
    "vietnam-hanoi": [
      { name: "Tết (Lunar New Year)", month: 2, blurb: "Vietnam's biggest holiday; much of the country closes." },
    ],
    "cambodia-siemreap": [
      { name: "Water Festival (Bon Om Touk)", month: 11, blurb: "Boat races celebrating the reversing Tonlé Sap." },
      { name: "Khmer New Year", month: 4, blurb: "Three days of temple visits and games." },
    ],
    "peru-cusco": [
      { name: "Inti Raymi", month: 6, blurb: "Grand Inca festival of the sun at Sacsayhuamán." },
    ],
    "brazil-rio": [
      { name: "Carnival", month: 2, blurb: "The world's biggest street party, citywide." },
      { name: "Réveillon (New Year's Eve)", month: 12, blurb: "Millions in white on Copacabana for the fireworks." },
    ],
    "japan-kyoto": [
      { name: "Cherry blossom (hanami)", month: 4, blurb: "Sakura season — picnics under the blossoms." },
      { name: "Gion Matsuri", month: 7, blurb: "Kyoto's grand month-long float procession." },
      { name: "Autumn foliage (kōyō)", month: 11, blurb: "Temples framed by blazing maple leaves." },
    ],
    "nepal-kathmandu": [
      { name: "Dashain", month: 10, blurb: "Nepal's longest, most important Hindu festival." },
      { name: "Tihar (Diwali)", month: 11, blurb: "The festival of lights across the valley." },
      { name: "Holi", month: 3, blurb: "The riotous festival of colours." },
    ],
    "sri-lanka-south": [
      { name: "Esala Perahera", month: 8, blurb: "Kandy's spectacular procession of caparisoned elephants." },
    ],
    "colombia-cartagena": [
      { name: "Hay Festival", month: 1, blurb: "Major literature and arts festival in the old city." },
      { name: "Independence Festival", month: 11, blurb: "Cartagena's raucous music-filled street celebration." },
    ],
    "montenegro-kotor": [
      { name: "Kotor Carnival", month: 2, blurb: "Masked winter carnival in the walled town." },
      { name: "Boka Night", month: 8, blurb: "Decorated boats and fireworks across the bay." },
    ],
    "india-rajasthan": [
      { name: "Diwali", month: 11, blurb: "The festival of lights across the region." },
      { name: "Pushkar Camel Fair", month: 11, blurb: "Vast desert livestock fair and folk festival." },
      { name: "Holi", month: 3, blurb: "The riotous festival of colours." },
    ],
    "mexico-yucatan": [
      { name: "Día de Muertos", month: 11, blurb: "Day of the Dead — altars, marigolds, processions." },
    ],
    "greece-santorini": [
      { name: "Ifestia Festival", month: 8, blurb: "Re-enacted volcanic eruption with fireworks over the caldera." },
    ],
    "japan-tokyo": [
      { name: "Cherry blossom (hanami)", month: 4, blurb: "Sakura picnics in the city's parks." },
      { name: "Sumida River Fireworks", month: 7, blurb: "Tokyo's grand summer fireworks festival." },
      { name: "Autumn foliage (kōyō)", month: 11, blurb: "Ginkgo and maple ablaze across the city." },
    ],
    "japan-hokkaido": [
      { name: "Sapporo Snow Festival", month: 2, blurb: "Giant snow and ice sculptures fill Odori Park." },
      { name: "Furano Lavender season", month: 7, blurb: "Hillsides of blooming lavender." },
    ],
    "japan-okinawa": [
      { name: "Eisā drum festival", month: 8, blurb: "Thunderous Okinawan drum-and-dance celebrations." },
      { name: "Naha Great Tug-of-War", month: 10, blurb: "A giant rope and street festival in the capital." },
    ],
    "india-agra": [
      { name: "Taj Mahotsav", month: 2, blurb: "Ten-day arts, crafts and food festival near the Taj." },
      { name: "Holi", month: 3, blurb: "The riotous festival of colours." },
      { name: "Diwali", month: 11, blurb: "The festival of lights across North India." },
    ],
    "france-paris": [
      { name: "Bastille Day", month: 7, blurb: "Parade on the Champs-Élysées and fireworks at the Eiffel Tower." },
      { name: "Fête de la Musique", month: 6, blurb: "Free music fills the streets on the solstice." },
    ],
    "italy-rome": [
      { name: "Holy Week & Easter", month: 4, blurb: "Papal Mass and processions at the Vatican." },
      { name: "Natale di Roma", month: 4, blurb: "Rome's birthday — parades and re-enactments." },
    ],
    "australia-sydney": [
      { name: "New Year's Eve fireworks", month: 12, blurb: "One of the world's first and biggest harbour fireworks." },
      { name: "Vivid Sydney", month: 6, blurb: "Light, music and ideas festival across the harbour." },
    ],
    "newzealand-queenstown": [
      { name: "Queenstown Winter Festival", month: 6, blurb: "Ski-town carnival kicking off the snow season." },
    ],
    "philippines-manila": [
      { name: "Feast of the Black Nazarene", month: 1, blurb: "Vast barefoot devotional procession through the old city." },
    ],
    "philippines-cebu": [
      { name: "Sinulog Festival", month: 1, blurb: "The country's grandest fiesta — drums, dance and colour." },
    ],
    "philippines-siargao": [
      { name: "Siargao Surfing Cup", month: 9, blurb: "International surf competition at Cloud 9." },
    ],
    "philippines-dumaguete": [
      { name: "Buglasan Festival", month: 10, blurb: "Negros Oriental's 'festival of festivals' with street dancing." },
    ],
    "malaysia-kualalumpur": [
      { name: "Thaipusam", month: 1, blurb: "Hindu pilgrimage with kavadi-bearers at Batu Caves (Jan/Feb)." },
    ],
    "malaysia-penang": [
      { name: "George Town Festival", month: 8, blurb: "Month-long arts and heritage festival across the old town." },
    ],
    "malaysia-sabah": [
      { name: "Kaamatan (Harvest Festival)", month: 5, blurb: "Kadazan-Dusun thanksgiving with dance, music and tapai." },
    ],
    "philippines-vigan": [
      { name: "Binatbatan Festival of the Arts", month: 5, blurb: "Street dancing celebrating Vigan's weaving and crafts." },
    ],
    "puerto-rico-sanjuan": [
      { name: "Fiestas de la Calle San Sebastián", month: 1, blurb: "Old San Juan's biggest street festival — music, dance, food." },
    ],
    "brazil-florianopolis": [
      { name: "Carnival", month: 2, blurb: "Southern Brazil's beach-party Carnival." },
    ],
    "thailand-krabi": [
      { name: "Songkran", month: 4, blurb: "Thai New Year — the nationwide water-fight festival." },
      { name: "Loy Krathong", month: 11, blurb: "Candle-lit offerings floated out on the tide." },
    ],
    "thailand-kohsamui": [
      { name: "Songkran", month: 4, blurb: "Island-wide water fights for Thai New Year." },
      { name: "Loy Krathong", month: 11, blurb: "Floating candle-lit offerings on the full moon." },
    ],
    "vietnam-hoian": [
      { name: "Tết (Lunar New Year)", month: 2, blurb: "Vietnam's biggest holiday; the old town glows with lanterns." },
      { name: "Mid-Autumn Lantern Festival", month: 9, blurb: "Hội An's signature lantern-lit full-moon celebration." },
    ],
    "vietnam-hcmc": [
      { name: "Tết (Lunar New Year)", month: 2, blurb: "Nguyễn Huệ flower street and citywide festivities." },
      { name: "Reunification Day", month: 4, blurb: "April 30 parades and fireworks." },
    ],
    "philippines-palawan": [
      { name: "Baragatan Festival", month: 6, blurb: "Palawan's founding-anniversary street-dancing and feasts." },
    ],
    "bolivia-uyuni": [
      { name: "Carnaval de Oruro", month: 2, blurb: "Bolivia's UNESCO-listed dance carnival, a day's drive north." },
      { name: "Todos Santos (Day of the Dead)", month: 11, blurb: "Altars and graveside vigils across the Altiplano." },
    ],
    "patagonia-elcalafate": [
      { name: "Fiesta Nacional del Lago Argentino", month: 2, blurb: "El Calafate's gaucho festival of food, music and riding." },
    ],
    "brazil-amazon-manaus": [
      { name: "Festival de Parintins", month: 6, blurb: "The vast Boi-Bumbá folklore showdown near Manaus." },
      { name: "Festival Amazonas de Ópera", month: 5, blurb: "Opera season at the historic Teatro Amazonas." },
    ],
    "chile-atacama": [
      { name: "Fiesta de La Tirana", month: 7, blurb: "Northern Chile's biggest religious dance pilgrimage." },
      { name: "Carnaval Andino", month: 2, blurb: "Three days of Andean music and costume in the desert." },
    ],
    "albania-riviera": [
      { name: "Kala Festival", month: 6, blurb: "Beach music festival on the sands at Dhërmi." },
      { name: "Summer Day (Dita e Verës)", month: 3, blurb: "Ancient pagan welcome-to-spring celebration." },
    ],
    "turkey-cappadocia": [
      { name: "Cappadox Festival", month: 6, blurb: "Music, art and outdoor events among the fairy chimneys." },
      { name: "Hacı Bektaş Veli commemoration", month: 8, blurb: "Pilgrimage and ceremonies at the nearby dervish lodge." },
    ],
    "morocco-marrakech": [
      { name: "Marrakech International Film Festival", month: 11, blurb: "Stars and screenings across the red city." },
      { name: "Festival National des Arts Populaires", month: 7, blurb: "Folk musicians and dancers fill the palaces and squares." },
    ],
    "tanzania-zanzibar": [
      { name: "Sauti za Busara", month: 2, blurb: "Stone Town's joyful pan-African music festival." },
      { name: "Zanzibar International Film Festival", month: 7, blurb: "East Africa's biggest film and arts gathering." },
    ],
    "south-africa-capetown": [
      { name: "Cape Town Minstrel Carnival", month: 1, blurb: "Tweede Nuwe Jaar — costumed troupes parade the city." },
      { name: "Cape Town International Jazz Festival", month: 3, blurb: "Africa's grandest jazz gathering." },
    ],
    "costa-rica-arenal": [
      { name: "Fiestas de Palmares", month: 1, blurb: "Two weeks of rodeo, music and revelry near La Fortuna." },
      { name: "Independence Day", month: 9, blurb: "Lantern parades and the torch run on September 15." },
    ],
    "egypt-cairo": [
      { name: "Sham El-Nessim", month: 4, blurb: "Ancient Egyptian spring festival — picnics along the Nile." },
      { name: "Cairo International Film Festival", month: 11, blurb: "The Arab world's oldest major film festival." },
    ],
    "philippines-boracay": [
      { name: "Ati-Atihan", month: 1, blurb: "Aklan's wild tribal mardi-gras, a boat ride from the island." },
    ],
    "philippines-bohol": [
      { name: "Sandugo Festival", month: 7, blurb: "Re-enacts the 1565 blood compact with street dancing." },
    ],
    "philippines-banaue": [
      { name: "Imbayah Festival", month: 4, blurb: "Ifugao thanksgiving of rice wine, dance and rituals." },
    ],
    "malaysia-langkawi": [
      { name: "Chinese New Year", month: 2, blurb: "Lion dances and night markets across the island." },
      { name: "LIMA Aerospace & Maritime Show", month: 5, blurb: "Aerobatics over the bay (odd-numbered years)." },
    ],
    "malaysia-malacca": [
      { name: "Festa San Pedro", month: 6, blurb: "The Portuguese-Eurasian settlement's patron-saint fiesta." },
      { name: "Chinese New Year", month: 2, blurb: "Jonker Street ablaze with lanterns and street food." },
    ],
    "philippines-coron": [
      { name: "Coron Town Fiesta", month: 8, blurb: "Patronal feast with boat parades around the bay." },
    ],
    "thailand-huahin": [
      { name: "Hua Hin Jazz Festival", month: 8, blurb: "Free seaside concerts the royal resort town is known for." },
      { name: "Songkran", month: 4, blurb: "Thai New Year water festival." },
    ],
    "mexico-playadelcarmen": [
      { name: "Día de los Muertos", month: 11, blurb: "Altars and processions for the Day of the Dead." },
      { name: "Carnaval", month: 2, blurb: "Pre-Lenten parades along the Riviera Maya." },
    ],
    "thailand-kohphangan": [
      { name: "Full Moon Party", month: 1, blurb: "Every full moon — the island's legendary all-night beach party at Haad Rin." },
      { name: "Songkran", month: 4, blurb: "Thai New Year water festival." },
    ],
    "thailand-kohtao": [
      { name: "Songkran", month: 4, blurb: "Thai New Year water festival." },
      { name: "Loy Krathong", month: 11, blurb: "Candle-lit offerings floated on the full moon." },
    ],
    "thailand-phuket": [
      { name: "Phuket Vegetarian Festival", month: 10, blurb: "Striking Taoist rites of fasting and body-piercing processions." },
      { name: "Songkran", month: 4, blurb: "Thai New Year water festival." },
    ],
    "indonesia-gili": [
      { name: "Bau Nyale", month: 2, blurb: "Lombok's sea-worm-catching festival, rooted in legend." },
      { name: "Independence Day", month: 8, blurb: "August 17 boat races and games." },
    ],
    "cambodia-kohrong": [
      { name: "Khmer New Year", month: 4, blurb: "Three days of games and temple visits." },
      { name: "Water Festival (Bon Om Touk)", month: 11, blurb: "Boat races marking the reversing river." },
    ],
    "vietnam-phuquoc": [
      { name: "Tết (Lunar New Year)", month: 2, blurb: "Vietnam's biggest holiday." },
      { name: "Dinh Cậu Temple Festival", month: 10, blurb: "Islanders honour the sea gods at the cliff-top shrine." },
    ],
    "india-goa": [
      { name: "Goa Carnival", month: 2, blurb: "Portuguese-rooted pre-Lenten parades led by King Momo." },
      { name: "Sunburn Festival", month: 12, blurb: "Asia's biggest electronic-music festival on the beach." },
    ],
    "indonesia-nusapenida": [
      { name: "Nyepi (Day of Silence)", month: 3, blurb: "Balinese New Year — the island falls completely silent." },
    ],
    "frenchpolynesia-borabora": [
      { name: "Heiva i Bora Bora", month: 7, blurb: "Polynesian dance, song and outrigger-canoe contests." },
      { name: "Hawaiki Nui Va'a", month: 11, blurb: "The grueling inter-island outrigger-canoe race finishes here." },
    ],
    "usa-maui": [
      { name: "Maui Film Festival", month: 6, blurb: "Starlit open-air screenings in Wailea." },
      { name: "Aloha Festivals", month: 9, blurb: "Hawaiian music, hula and a royal court celebration." },
    ],
    "brazil-curitiba": [
      { name: "Festival de Teatro de Curitiba", month: 3, blurb: "One of Latin America's largest theatre festivals." },
    ],
  };

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

for (const region of REGIONS) {
  if (EVENTS[region.id]) region.events = EVENTS[region.id];
  if (DAILY_BUDGET[region.id]) region.dailyBudget = DAILY_BUDGET[region.id];
  if (WIKI_TITLE[region.id]) region.wikiTitle = WIKI_TITLE[region.id];
  if (PHOTOS[region.id]) region.photo = PHOTOS[region.id];
  if (TRAVEL_INFO[region.id]) region.info = TRAVEL_INFO[region.id];
  if (TOOLKITS[region.id]) region.toolkit = TOOLKITS[region.id];
}

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Every festival across all regions, paired with its region, sorted by month. */
export function getAllEvents(): { event: Event; region: Region }[] {
  return REGIONS.flatMap((region) =>
    (region.events ?? []).map((event) => ({ event, region }))
  ).sort((a, b) => a.event.month - b.event.month);
}
