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
const THAI = { emergency: "191 police · 1669 ambulance · 1155 tourist police", tipping: "Not expected; round up, ~10% at upscale spots", water: "Not potable — drink bottled" };
const VIET = { emergency: "113 police · 115 ambulance · 114 fire", tipping: "Not customary; appreciated", water: "Not potable — drink bottled" };

export const TOOLKITS: Record<string, TravelToolkit> = {
  // ── Southeast Asia ──
  "thailand-chiangmai": { phrases: th, ...THAI },
  "thailand-bangkok": { phrases: th, ...THAI },
  "thailand-krabi": { phrases: th, ...THAI },
  "thailand-kohsamui": { phrases: th, ...THAI },
  "vietnam-hoian": { phrases: vn, ...VIET },
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
};
