import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWeather } from "@/lib/weather";

afterEach(() => vi.unstubAllGlobals());

describe("fetchWeather", () => {
  it("extracts the IANA timezone from the Open-Meteo response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              timezone: "Asia/Bangkok",
              current: { temperature_2m: 30, precipitation: 0, weather_code: 1 },
              daily: {
                time: ["2026-07-05"],
                temperature_2m_max: [32],
                temperature_2m_min: [26],
                precipitation_sum: [0],
                weather_code: [1],
              },
            }),
            { status: 200 }
          )
      )
    );
    const snapshot = await fetchWeather(13.75, 100.5);
    expect(snapshot.timezone).toBe("Asia/Bangkok");
  });

  it("defaults timezone to null when the upstream response omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              current: { temperature_2m: 30, precipitation: 0, weather_code: 1 },
              daily: {
                time: [],
                temperature_2m_max: [],
                temperature_2m_min: [],
                precipitation_sum: [],
                weather_code: [],
              },
            }),
            { status: 200 }
          )
      )
    );
    const snapshot = await fetchWeather(0, 0);
    expect(snapshot.timezone).toBeNull();
  });
});
