/** Great-circle distance between two coordinates, in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Hop {
  km: number;
  hours: number;
  usd: number;
  /** Short enough to realistically go overland (drive/train) rather than fly. */
  overland: boolean;
}

/**
 * Very rough travel estimate between two points — for ballpark budgeting only,
 * not a quote. Under ~350km it's treated as overland (slower, cheaper); beyond
 * that, a flight (cruise ~750 km/h + a 1.5h airport buffer).
 */
export function flightHop(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): Hop {
  const km = haversineKm(a, b);
  const overland = km < 350;
  return {
    km: Math.round(km),
    hours: overland
      ? Math.round((km / 70 + 0.5) * 10) / 10 // ~70 km/h door-to-door
      : Math.round((km / 750 + 1.5) * 10) / 10,
    usd: overland
      ? Math.round((10 + 0.04 * km) / 5) * 5
      : Math.round((60 + 0.09 * km) / 10) * 10,
    overland,
  };
}
