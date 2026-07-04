import { describe, expect, it } from "vitest";
import { GET as climateGET } from "@/app/api/climate/route";
import { GET as weatherGET } from "@/app/api/weather/route";

function req(path: string) {
  return new Request(`http://localhost${path}`);
}

describe("coordinate API validation", () => {
  it("rejects non-finite weather coordinates", async () => {
    const res = await weatherGET(req("/api/weather?lat=Infinity&lng=0"));
    expect(res.status).toBe(400);
  });

  it("rejects missing weather coordinates", async () => {
    const res = await weatherGET(req("/api/weather?lat=10"));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range climate coordinates", async () => {
    const res = await climateGET(req("/api/climate?lat=91&lng=0"));
    expect(res.status).toBe(400);
  });
});
