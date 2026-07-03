import { describe, it, expect, vi } from "vitest";

// The route imports server-only data modules; mock them to keep the test fast
// and deterministic.
vi.mock("@/data/sights", () => ({
  SIGHTS: {
    "thailand-chiangmai": [
      { name: "Doi Suthep", type: "culture", lat: 1, lng: 2, blurb: "Temple." },
    ],
  },
}));
vi.mock("@/data/toolkits", () => ({
  TOOLKITS: {
    "thailand-chiangmai": {
      phrases: [{ en: "Hi", local: "Sawatdee" }],
      emergency: "191",
      tipping: "10%",
      water: "Bottled",
    },
  },
}));
vi.mock("@/data/events", () => ({
  EVENTS: {
    "thailand-chiangmai": [{ name: "Yi Peng", month: 11, blurb: "Lanterns." }],
  },
}));

import { GET } from "@/app/api/region-detail/route";

function makeReq(id?: string) {
  const url = new URL("http://localhost/api/region-detail");
  if (id) url.searchParams.set("id", id);
  return new Request(url);
}

describe("/api/region-detail", () => {
  it("returns the assembled detail for a known region", async () => {
    const res = await GET(makeReq("thailand-chiangmai"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sights).toHaveLength(1);
    expect(json.sights[0].name).toBe("Doi Suthep");
    expect(json.toolkit.emergency).toBe("191");
    expect(json.events[0].name).toBe("Yi Peng");
    expect(json.advisory).toBeDefined();
    expect(["low", "moderate", "high"]).toContain(json.advisory.level);
  });

  it("returns 404 for an unknown region id", async () => {
    const res = await GET(makeReq("does-not-exist"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when no id is provided", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("sets a long revalidate cache header", async () => {
    const res = await GET(makeReq("thailand-chiangmai"));
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });
});
