export interface BookingUrlParams {
  /** Destination string Booking.com understands, e.g. "Cusco, Peru". */
  dest: string;
  /** YYYY-MM-DD */
  checkin?: string;
  /** YYYY-MM-DD */
  checkout?: string;
  adults?: number;
  rooms?: number;
  children?: number;
  /** Optional lat/lng to bias the search. */
  lat?: number;
  lng?: number;
  /** Affiliate id; falls back to NEXT_PUBLIC_BOOKING_AID. */
  aid?: string;
}

/**
 * Build a prefilled Booking.com search deep-link. Requires no API key — the
 * link simply opens Booking.com with the search applied. When an affiliate
 * `aid` is present the visit is attributed for commission.
 */
export function buildBookingUrl(params: BookingUrlParams): string {
  const {
    dest,
    checkin,
    checkout,
    adults = 2,
    rooms = 1,
    children = 0,
    lat,
    lng,
    aid = process.env.NEXT_PUBLIC_BOOKING_AID,
  } = params;

  const search = new URLSearchParams();
  search.set("ss", dest);
  if (checkin) search.set("checkin", checkin);
  if (checkout) search.set("checkout", checkout);
  search.set("group_adults", String(adults));
  search.set("no_rooms", String(rooms));
  search.set("group_children", String(children));
  if (lat != null && lng != null) {
    search.set("latitude", String(lat));
    search.set("longitude", String(lng));
  }
  if (aid) search.set("aid", aid);
  search.set("label", "seasons-and-sights");

  return `https://www.booking.com/searchresults.html?${search.toString()}`;
}
