import type { Event } from "@/types";

/**
 * Festivals/events per region id. Kept separate from sights.ts/toolkits.ts so
 * the festivals view (the only slim consumer that needs this) doesn't also
 * pull in sights or toolkit data, and so every other slim view doesn't pull
 * this in either. See src/data/events-slim.ts.
 */
export const EVENTS: Record<string, { name: string; month: number; blurb: string }[]> =
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
      { name: "Songkran", month: 4, blurb: "Thai New Year water festival." },
      { name: "Loy Krathong", month: 11, blurb: "Candle-lit offerings floated on the full moon — beyond the island's year-round Full Moon Parties." },
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
