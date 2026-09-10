import { describe, expect, it } from "vitest";
import {
  rankPlaces,
  weightedRating,
  type NearbyPlace,
} from "@/lib/places";

function place(p: Partial<NearbyPlace> & { id: string }): NearbyPlace {
  return {
    name: p.id,
    rating: null,
    reviewCount: null,
    lat: 16.06,
    lng: 108.22,
    address: null,
    openNow: null,
    mapsUrl: null,
    priceLevel: null,
    distanceKm: 0.5,
    ...p,
  };
}

describe("nearby ranking", () => {
  it("does not let a thinly-reviewed 5.0 outrank a well-reviewed 4.6", () => {
    const ranked = rankPlaces([
      place({ id: "new-place", rating: 5, reviewCount: 3 }),
      place({ id: "local-favourite", rating: 4.6, reviewCount: 900 }),
    ]);
    expect(ranked[0].id).toBe("local-favourite");
  });

  it("still ranks a well-reviewed 5.0 first", () => {
    const ranked = rankPlaces([
      place({ id: "good", rating: 4.6, reviewCount: 900 }),
      place({ id: "great", rating: 5, reviewCount: 900 }),
    ]);
    expect(ranked[0].id).toBe("great");
  });

  it("lets a new place climb as reviews accumulate", () => {
    const few = weightedRating(4.9, 5);
    const many = weightedRating(4.9, 500);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeLessThanOrEqual(4.9);
  });

  it("sinks unrated places below rated ones instead of dropping them", () => {
    const ranked = rankPlaces([
      place({ id: "unrated" }),
      place({ id: "rated", rating: 3.2, reviewCount: 40 }),
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["rated", "unrated"]);
  });

  it("breaks ties on distance", () => {
    const ranked = rankPlaces([
      place({ id: "far", rating: 4.5, reviewCount: 100, distanceKm: 1.2 }),
      place({ id: "near", rating: 4.5, reviewCount: 100, distanceKm: 0.2 }),
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["near", "far"]);
  });

  it("does not mutate the caller's array", () => {
    const input = [
      place({ id: "a", rating: 3, reviewCount: 100 }),
      place({ id: "b", rating: 5, reviewCount: 100 }),
    ];
    rankPlaces(input);
    expect(input.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
