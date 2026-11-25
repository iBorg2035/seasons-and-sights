import type { Phrase, TravelToolkit } from "@/types";

// Shared phrase sets for languages used by several destinations.
const es: Phrase[] = [
  { en: "Hello", local: "Hola" },
  { en: "Thank you", local: "Gracias" },
  { en: "How much?", local: "¿Cuánto cuesta?" },
  { en: "Help!", local: "¡Ayuda!" },
];
const jp: Phrase[] = [
  { en: "Hello", local: "Konnichiwa (こんにちは)" },
  { en: "Thank you", local: "Arigatō (ありがとう)" },
  { en: "How much?", local: "Ikura desu ka? (いくらですか)" },
  { en: "Help!", local: "Tasukete! (助けて)" },
];
const th: Phrase[] = [
  { en: "Hello", local: "Sawatdee (สวัสดี)" },
  { en: "Thank you", local: "Khop khun (ขอบคุณ)" },
  { en: "How much?", local: "Tao rai? (เท่าไร)" },
  { en: "Help!", local: "Chuay duay! (ช่วยด้วย)" },
];
const vn: Phrase[] = [
  { en: "Hello", local: "Xin chào" },
  { en: "Thank you", local: "Cảm ơn" },
  { en: "How much?", local: "Bao nhiêu tiền?" },
  { en: "Help!", local: "Cứu với!" },
];
const ph: Phrase[] = [
  { en: "Hello", local: "Kumusta" },
  { en: "Thank you", local: "Salamat" },
  { en: "How much?", local: "Magkano?" },
  { en: "Help!", local: "Tulong!" },
];
const ms: Phrase[] = [
  { en: "Hello", local: "Helo / Selamat" },
  { en: "Thank you", local: "Terima kasih" },
  { en: "How much?", local: "Berapa harga?" },
  { en: "Help!", local: "Tolong!" },
];
const idn: Phrase[] = [
  { en: "Hello", local: "Halo / Selamat" },
  { en: "Thank you", local: "Terima kasih" },
  { en: "How much?", local: "Berapa harganya?" },
  { en: "Help!", local: "Tolong!" },
];
const khm: Phrase[] = [
  { en: "Hello", local: "Suostei (សួស្ដី)" },
  { en: "Thank you", local: "Arkun (អរគុណ)" },
  { en: "How much?", local: "Tlay ponman?" },
  { en: "Help!", local: "Chuoy phong!" },
];
const lao: Phrase[] = [
  { en: "Hello", local: "Sabaidee (ສະບາຍດີ)" },
  { en: "Thank you", local: "Khop chai (ຂອບໃຈ)" },
  { en: "How much?", local: "Thao dai? (ເທົ່າໃດ)" },
  { en: "Help!", local: "Suay dae! (ຊ່ວຍແດ່)" },
];
const zh: Phrase[] = [
  { en: "Hello", local: "Nǐ hǎo (你好)" },
  { en: "Thank you", local: "Xièxie (謝謝)" },
  { en: "How much?", local: "Duōshǎo qián? (多少錢)" },
  { en: "Help!", local: "Jiùmìng! (救命)" },
];
const yue: Phrase[] = [
  { en: "Hello", local: "Néih hóu (你好)" },
  { en: "Thank you", local: "M̀h'gōi (唔該)" },
  { en: "How much?", local: "Géi dō chín? (幾多錢)" },
  { en: "Help!", local: "Gau mehng! (救命)" },
];
const ko: Phrase[] = [
  { en: "Hello", local: "Annyeonghaseyo (안녕하세요)" },
  { en: "Thank you", local: "Gamsahamnida (감사합니다)" },
  { en: "How much?", local: "Eolmayeyo? (얼마예요)" },
  { en: "Help!", local: "Dowajuseyo! (도와주세요)" },
];
// English is the working language; these are the Malay and Mandarin you will hear.
const sg: Phrase[] = [
  { en: "Hello", local: "Hello / Nǐ hǎo (你好)" },
  { en: "Thank you", local: "Terima kasih / Xièxie (谢谢)" },
  { en: "How much?", local: "Berapa? / Duōshǎo qián? (多少钱)" },
  { en: "Help!", local: "Tolong! / Jiùmìng! (救命)" },
];
const LAO = { emergency: "1191 police · 1195 ambulance · 1192 tourist police", tipping: "Not expected; small tips welcome", water: "Not potable — drink bottled" };
const SING = { emergency: "999 police · 995 ambulance/fire", tipping: "Not expected; 10% service charge is usual", water: "Tap water safe" };
const TAIW = { emergency: "110 police · 119 ambulance/fire", tipping: "Not customary", water: "Tap best boiled; bottled common" };
const KOR = { emergency: "112 police · 119 ambulance/fire · 1330 tourist helpline", tipping: "No tipping", water: "Tap water safe" };
const HK = { emergency: "999", tipping: "10% service charge usual; round up taxis", water: "Tap water safe; many prefer boiled" };
const THAI = { emergency: "191 police · 1669 ambulance · 1155 tourist police", tipping: "Not expected; round up, ~10% at upscale spots", water: "Not potable — drink bottled" };
const INDO = { emergency: "112 · 110 police · 118 ambulance", tipping: "Not expected; round up", water: "Not potable — drink bottled" };
const KHM = { emergency: "117 police · 119 ambulance", tipping: "Not expected; small tips welcome", water: "Not potable — drink bottled" };
const VIET = { emergency: "113 police · 115 ambulance · 114 fire", tipping: "Not customary; appreciated", water: "Not potable — drink bottled" };
const PHIL = { emergency: "911", tipping: "~10% common", water: "Bottled safer; tap varies" };
const MAL = { emergency: "999 · 112 (mobile)", tipping: "Not expected; round up", water: "Tap best boiled; bottled common" };

export const TOOLKITS: Record<string, TravelToolkit> = {
  // ── Southeast Asia ──
  "thailand-chiangmai": { phrases: th, ...THAI },
  "thailand-bangkok": { phrases: th, ...THAI },
  "thailand-krabi": { phrases: th, ...THAI },
  "thailand-kohsamui": { phrases: th, ...THAI },
  "vietnam-hoian": { phrases: vn, ...VIET },
  "vietnam-quynhon": { phrases: vn, ...VIET },
  "vietnam-nhatrang": { phrases: vn, ...VIET },
  "vietnam-dalat": { phrases: vn, ...VIET },
  "vietnam-hanoi": { phrases: vn, ...VIET },
  "vietnam-hcmc": { phrases: vn, ...VIET },
  "indonesia-bali": { phrases: [{ en: "Hello", local: "Halo / Selamat" }, { en: "Thank you", local: "Terima kasih" }, { en: "How much?", local: "Berapa harganya?" }, { en: "Help!", local: "Tolong!" }], emergency: "112 · 110 police · 118 ambulance", tipping: "Not expected; round up", water: "Not potable — drink bottled" },
  "cambodia-siemreap": { phrases: [{ en: "Hello", local: "Suostei (សួស្ដី)" }, { en: "Thank you", local: "Arkun (អរគុណ)" }, { en: "How much?", local: "Tlay ponman?" }, { en: "Help!", local: "Chuoy phong!" }], emergency: "117 police · 119 ambulance", tipping: "Not expected; small tips welcome", water: "Not potable — drink bottled" },
  "philippines-palawan": { phrases: [{ en: "Hello", local: "Kumusta" }, { en: "Thank you", local: "Salamat" }, { en: "How much?", local: "Magkano?" }, { en: "Help!", local: "Tulong!" }], emergency: "911", tipping: "~10% common", water: "Bottled safer; tap varies" },
  // ── South Asia ──
  "sri-lanka-south": { phrases: [{ en: "Hello", local: "Ayubowan (ආයුබෝවන්)" }, { en: "Thank you", local: "Istuti (ස්තූතියි)" }, { en: "How much?", local: "Keeyada?" }, { en: "Help!", local: "Udav karanna!" }], emergency: "119 police · 110 ambulance", tipping: "~10%", water: "Not potable — drink bottled" },
  "nepal-kathmandu": { phrases: [{ en: "Hello", local: "Namaste (नमस्ते)" }, { en: "Thank you", local: "Dhanyabad (धन्यवाद)" }, { en: "How much?", local: "Kati ho?" }, { en: "Help!", local: "Maddat!" }], emergency: "100 police · 102 ambulance", tipping: "~10%; tip guides & porters", water: "Not potable — treat or buy bottled" },
  "india-rajasthan": { phrases: [{ en: "Hello", local: "Namaste (नमस्ते)" }, { en: "Thank you", local: "Dhanyavaad (धन्यवाद)" }, { en: "How much?", local: "Kitne ka hai?" }, { en: "Help!", local: "Madad!" }], emergency: "112 · 100 police · 102 ambulance", tipping: "~10%; small tips (baksheesh)", water: "Not potable — drink bottled" },
  // ── East Asia ──
  "japan-kyoto": { phrases: jp, emergency: "110 police · 119 fire/ambulance", tipping: "No tipping — it can confuse", water: "Tap water safe" },
  "japan-tokyo": { phrases: jp, emergency: "110 police · 119 fire/ambulance", tipping: "No tipping — it can confuse", water: "Tap water safe" },
  "japan-hokkaido": { phrases: jp, emergency: "110 police · 119 fire/ambulance", tipping: "No tipping — it can confuse", water: "Tap water safe" },
  "japan-okinawa": { phrases: jp, emergency: "110 police · 119 fire/ambulance", tipping: "No tipping — it can confuse", water: "Tap water safe" },
  // ── South America ──
  "peru-cusco": { phrases: es, emergency: "105 police · 116 fire/ambulance", tipping: "~10% at restaurants", water: "Not potable — drink bottled" },
  "bolivia-uyuni": { phrases: es, emergency: "110 police · 118 ambulance", tipping: "Not expected; round up", water: "Not potable — drink bottled" },
  "patagonia-elcalafate": { phrases: es, emergency: "911 (Arg) · 133 police (Chile)", tipping: "~10% at restaurants", water: "Generally safe in towns" },
  "brazil-rio": { phrases: [{ en: "Hello", local: "Olá" }, { en: "Thank you", local: "Obrigado/a" }, { en: "How much?", local: "Quanto custa?" }, { en: "Help!", local: "Socorro!" }], emergency: "190 police · 192 ambulance · 193 fire", tipping: "~10%, often included", water: "Bottled safer" },
  "brazil-amazon-manaus": { phrases: [{ en: "Hello", local: "Olá" }, { en: "Thank you", local: "Obrigado/a" }, { en: "How much?", local: "Quanto custa?" }, { en: "Help!", local: "Socorro!" }], emergency: "190 police · 192 ambulance", tipping: "~10%, often included", water: "Not potable — drink bottled" },
  "colombia-cartagena": { phrases: es, emergency: "123", tipping: "~10%, often included (propina)", water: "Bottled safer" },
  "chile-atacama": { phrases: es, emergency: "133 police · 131 ambulance", tipping: "~10% at restaurants", water: "Generally safe; bottled in desert" },
  "ecuador-galapagos": { phrases: es, emergency: "911", tipping: "~10%", water: "Not potable — drink bottled" },
  // ── North America ──
  "mexico-yucatan": { phrases: es, emergency: "911", tipping: "~10–15% (propina)", water: "Not potable — drink bottled" },
  // ── Europe ──
  "albania-riviera": { phrases: [{ en: "Hello", local: "Përshëndetje" }, { en: "Thank you", local: "Faleminderit" }, { en: "How much?", local: "Sa kushton?" }, { en: "Help!", local: "Ndihmë!" }], emergency: "112 · 129 police · 127 ambulance", tipping: "Round up / ~10%", water: "Bottled safer" },
  "montenegro-kotor": { phrases: [{ en: "Hello", local: "Zdravo" }, { en: "Thank you", local: "Hvala" }, { en: "How much?", local: "Koliko košta?" }, { en: "Help!", local: "Upomoć!" }], emergency: "112 · 122 police · 124 ambulance", tipping: "~10%", water: "Tap water safe" },
  "turkey-cappadocia": { phrases: [{ en: "Hello", local: "Merhaba" }, { en: "Thank you", local: "Teşekkürler" }, { en: "How much?", local: "Ne kadar?" }, { en: "Help!", local: "İmdat!" }], emergency: "112", tipping: "~10% (bahşiş)", water: "Bottled safer" },
  "greece-santorini": { phrases: [{ en: "Hello", local: "Yassou (Γεια σου)" }, { en: "Thank you", local: "Efcharistó (Ευχαριστώ)" }, { en: "How much?", local: "Póso káni?" }, { en: "Help!", local: "Voíthia! (Βοήθεια)" }], emergency: "112 · 100 police · 166 ambulance", tipping: "~5–10%", water: "Tap OK on mainland; bottled on islands" },
  // ── Africa ──
  "morocco-marrakech": { phrases: [{ en: "Hello", local: "Salam (السلام)" }, { en: "Thank you", local: "Shukran (شكراً)" }, { en: "How much?", local: "Bish-hal?" }, { en: "Help!", local: "'Awni! (عاوني)" }], emergency: "19 police · 15 ambulance · 112 (mobile)", tipping: "Small tips expected widely", water: "Not potable — drink bottled" },
  "tanzania-zanzibar": { phrases: [{ en: "Hello", local: "Jambo / Habari" }, { en: "Thank you", local: "Asante" }, { en: "How much?", local: "Bei gani?" }, { en: "Help!", local: "Saidia!" }], emergency: "112 · 999", tipping: "~10%; tip guides", water: "Not potable — drink bottled" },
  "south-africa-capetown": { phrases: [{ en: "Hello", local: "Hello / Sawubona" }, { en: "Thank you", local: "Thank you / Ngiyabonga" }, { en: "How much?", local: "How much?" }, { en: "Help!", local: "Help!" }], emergency: "112 (mobile) · 10111 police · 10177 ambulance", tipping: "~10–15%", water: "Tap water safe in cities" },
  "egypt-cairo": { phrases: [{ en: "Hello", local: "Salām (سلام)" }, { en: "Thank you", local: "Shukran (شكراً)" }, { en: "How much?", local: "Bikam? (بكام)" }, { en: "Help!", local: "Musā'ada! (مساعدة)" }], emergency: "122 police · 123 ambulance · 126 tourist police", tipping: "Baksheesh customary; ~10%", water: "Not potable — drink bottled" },
  // ── North America ──
  "costa-rica-arenal": { phrases: es, emergency: "911", tipping: "~10% often included (servicio); round up", water: "Tap safe in towns; bottled in rural areas" },
  // ── South Asia ──
  "india-agra": { phrases: [{ en: "Hello", local: "Namaste (नमस्ते)" }, { en: "Thank you", local: "Dhanyavaad (धन्यवाद)" }, { en: "How much?", local: "Kitne ka hai?" }, { en: "Help!", local: "Madad!" }], emergency: "112 · 100 police · 102 ambulance", tipping: "~10%", water: "Not potable — drink bottled" },
  // ── Europe ──
  "france-paris": { phrases: [{ en: "Hello", local: "Bonjour" }, { en: "Thank you", local: "Merci" }, { en: "How much?", local: "Combien ?" }, { en: "Help!", local: "À l'aide !" }], emergency: "112 · 15 ambulance · 17 police", tipping: "Service included; round up / ~5%", water: "Tap water safe" },
  "italy-rome": { phrases: [{ en: "Hello", local: "Ciao / Buongiorno" }, { en: "Thank you", local: "Grazie" }, { en: "How much?", local: "Quanto costa?" }, { en: "Help!", local: "Aiuto!" }], emergency: "112", tipping: "Service often included; round up", water: "Tap & street fountains (nasoni) safe" },
  // ── Oceania ──
  "australia-sydney": { phrases: [{ en: "Hello", local: "G'day" }, { en: "Thank you", local: "Thanks / Ta" }, { en: "How much?", local: "How much?" }, { en: "Help!", local: "Help!" }], emergency: "000", tipping: "Not expected; round up for great service", water: "Tap water safe" },
  "newzealand-queenstown": { phrases: [{ en: "Hello", local: "Kia ora" }, { en: "Thank you", local: "Thanks / Ngā mihi" }, { en: "How much?", local: "How much?" }, { en: "Help!", local: "Help!" }], emergency: "111", tipping: "Not expected", water: "Tap water safe" },
  // ── Philippines ──
  "philippines-manila": { phrases: ph, ...PHIL },
  "philippines-makati": { phrases: ph, ...PHIL },
  "philippines-bgc": { phrases: ph, ...PHIL },
  "philippines-cebu": { phrases: ph, ...PHIL },
  "philippines-mactan": { phrases: ph, ...PHIL },
  "philippines-boracay": { phrases: ph, ...PHIL },
  "philippines-bohol": { phrases: ph, ...PHIL },
  "philippines-siargao": { phrases: ph, ...PHIL },
  "philippines-banaue": { phrases: ph, ...PHIL },
  "philippines-dumaguete": { phrases: ph, ...PHIL },
  "philippines-coron": { phrases: ph, ...PHIL },
  "philippines-vigan": { phrases: ph, ...PHIL },
  "philippines-batanes": { phrases: ph, ...PHIL },
  // ── Malaysia ──
  "malaysia-kualalumpur": { phrases: ms, ...MAL },
  "malaysia-penang": { phrases: ms, ...MAL },
  "malaysia-langkawi": { phrases: ms, ...MAL },
  "malaysia-malacca": { phrases: ms, ...MAL },
  "malaysia-sabah": { phrases: ms, ...MAL },
  "thailand-huahin": { phrases: th, ...THAI },
  "thailand-kohphangan": { phrases: th, ...THAI },
  "thailand-kohtao": { phrases: th, ...THAI },
  "thailand-phuket": { phrases: th, ...THAI },
  "thailand-chiangrai": { phrases: th, ...THAI },
  "thailand-udonthani": { phrases: th, ...THAI },
  "thailand-khonkaen": { phrases: th, ...THAI },
  "vietnam-danang": { phrases: vn, ...VIET },
  "laos-luangprabang": { phrases: lao, ...LAO },
  "laos-vientiane": { phrases: lao, ...LAO },
  "singapore-singapore": { phrases: sg, ...SING },
  "cambodia-phnompenh": { phrases: khm, ...KHM },
  "indonesia-yogyakarta": { phrases: idn, ...INDO },
  "taiwan-taipei": { phrases: zh, ...TAIW },
  "southkorea-seoul": { phrases: ko, ...KOR },
  "hongkong-hongkong": { phrases: yue, ...HK },
  "thailand-pai": { phrases: th, ...THAI },
  "thailand-sukhothai": { phrases: th, ...THAI },
  "thailand-ayutthaya": { phrases: th, ...THAI },
  "thailand-kanchanaburi": { phrases: th, ...THAI },
  "thailand-kohlanta": { phrases: th, ...THAI },
  "thailand-kohchang": { phrases: th, ...THAI },
  "indonesia-gili": { phrases: idn, ...INDO },
  "indonesia-komodo": { phrases: idn, ...INDO },
  "indonesia-nusapenida": { phrases: idn, ...INDO },
  "cambodia-kohrong": { phrases: khm, ...KHM },
  "vietnam-phuquoc": { phrases: vn, ...VIET },
  "india-goa": { phrases: [{ en: "Hello", local: "Namaste (नमस्ते)" }, { en: "Thank you", local: "Dhanyavaad (धन्यवाद)" }, { en: "How much?", local: "Kitne ka hai?" }, { en: "Help!", local: "Madad!" }], emergency: "112 · 100 police · 108 ambulance", tipping: "~10%", water: "Not potable — drink bottled" },
  "maldives-atolls": { phrases: [{ en: "Hello", local: "Assalaamu alaikum" }, { en: "Thank you", local: "Shukuriyyaa (ޝުކުރިއްޔާ)" }, { en: "How much?", local: "Kihaavarakah?" }, { en: "Help!", local: "Eheevaa!" }], emergency: "119 police · 102 ambulance", tipping: "~10% (often a service charge)", water: "Desalinated; bottled common", },
  "frenchpolynesia-borabora": { phrases: [{ en: "Hello", local: "Ia ora na / Bonjour" }, { en: "Thank you", local: "Māuruuru / Merci" }, { en: "How much?", local: "Combien ?" }, { en: "Help!", local: "Au secours !" }], emergency: "112 · 15 ambulance · 17 police", tipping: "Not expected", water: "Tap generally safe on resort islands" },
  "usa-maui": { phrases: [{ en: "Hello", local: "Aloha" }, { en: "Thank you", local: "Mahalo" }, { en: "How much?", local: "How much?" }, { en: "Help!", local: "Help!" }], emergency: "911", tipping: "15–20% expected", water: "Tap water safe" },
  "mexico-playadelcarmen": { phrases: es, emergency: "911", tipping: "~10–15% (propina)", water: "Not potable — drink bottled" },
  "puerto-rico-sanjuan": { phrases: es, emergency: "911", tipping: "15–20% (US-standard)", water: "Tap water safe" },
  "brazil-florianopolis": { phrases: [{ en: "Hello", local: "Olá" }, { en: "Thank you", local: "Obrigado/a" }, { en: "How much?", local: "Quanto custa?" }, { en: "Help!", local: "Socorro!" }], emergency: "190 police · 192 ambulance · 193 fire", tipping: "~10%, often included", water: "Tap safe in cities" },
  "dominicanrepublic-lasterrenas": { phrases: es, emergency: "911", tipping: "10% service is added by law; ~10% more for good service", water: "Not potable — drink bottled" },
  "dominicanrepublic-puertoplata": { phrases: es, emergency: "911", tipping: "10% service is added by law; ~10% more for good service", water: "Not potable — drink bottled" },
  "mexico-cancun": { phrases: es, emergency: "911", tipping: "~10–15% (propina)", water: "Not potable — drink bottled" },
  "brazil-curitiba": { phrases: [{ en: "Hello", local: "Olá" }, { en: "Thank you", local: "Obrigado/a" }, { en: "How much?", local: "Quanto custa?" }, { en: "Help!", local: "Socorro!" }], emergency: "190 police · 192 ambulance · 193 fire", tipping: "~10%, often included", water: "Tap safe" },
};
