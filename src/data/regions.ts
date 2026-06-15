import type { MonthlyClimate, Region, Season } from "@/types";

const SEASON_BY_CHAR: Record<string, Season> = {
  D: "dry",
  W: "wet",
  S: "shoulder",
};

/**
 * Compact 12-char climate pattern (Jan→Dec): D=dry, W=wet, S=shoulder.
 * `notes` is keyed by 1-based month number.
 */
function climate(
  pattern: string,
  notes: Record<number, string> = {}
): MonthlyClimate {
  const months: MonthlyClimate = {};
  for (let i = 0; i < 12; i++) {
    const season = SEASON_BY_CHAR[pattern[i]];
    months[i + 1] = notes[i + 1] ? { season, note: notes[i + 1] } : { season };
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
    months: climate("WWWSSDDDSSWW", {
      2: "Carnival — hot, humid, packed",
      7: "mildest and driest",
      12: "hot; summer rains begin",
    }),
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
      "Two seasons, both rewarding: warm and calm December–May (sunny, best snorkeling), cool and misty June–November (the garúa — choppier seas but peak marine wildlife).",
    months: climate("DDDDDSSSSSSD", {
      3: "warm, calm seas — best snorkeling",
      6: "cool, misty garúa season begins",
      9: "cool season — peak marine wildlife",
    }),
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
];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
