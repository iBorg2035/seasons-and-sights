export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  weatherCode: number;
}

export interface WeatherSnapshot {
  current: {
    temperature: number;
    precipitation: number;
    weatherCode: number;
  };
  daily: DailyForecast[];
  /** Today's sunrise/sunset (ISO local, e.g. "2026-06-16T05:12"), if available. */
  sunrise: string | null;
  sunset: string | null;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

/** Fetch current conditions + a short daily forecast from Open-Meteo (no key). */
export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,precipitation,weather_code"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,sunrise,sunset"
  );
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo responded ${res.status}`);
  }
  const data: OpenMeteoResponse = await res.json();

  const daily: DailyForecast[] = (data.daily?.time ?? []).map((date, i) => ({
    date,
    tempMax: data.daily!.temperature_2m_max[i],
    tempMin: data.daily!.temperature_2m_min[i],
    precipitation: data.daily!.precipitation_sum[i],
    weatherCode: data.daily!.weather_code[i],
  }));

  return {
    current: {
      temperature: data.current?.temperature_2m ?? NaN,
      precipitation: data.current?.precipitation ?? 0,
      weatherCode: data.current?.weather_code ?? 0,
    },
    daily,
    sunrise: data.daily?.sunrise?.[0] ?? null,
    sunset: data.daily?.sunset?.[0] ?? null,
  };
}

export interface MonthlyNormal {
  /** 1-based month. */
  month: number;
  avgTempC: number;
  /** Average total rainfall for the month (mm). */
  avgPrecipMm: number;
}

interface ArchiveResponse {
  daily?: {
    time: string[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

/**
 * Monthly climate normals (avg temperature + rainfall) from Open-Meteo's
 * historical archive, averaged over 2019–2023. Used to back the curated season
 * strip with real data.
 */
export async function fetchClimateNormals(
  lat: number,
  lng: number
): Promise<MonthlyNormal[]> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("start_date", "2019-01-01");
  url.searchParams.set("end_date", "2023-12-31");
  url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
  url.searchParams.set("timezone", "auto");

  // Historical data never changes — cache for 30 days.
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!res.ok) throw new Error(`Open-Meteo archive responded ${res.status}`);
  const data: ArchiveResponse = await res.json();
  const daily = data.daily;
  if (!daily) throw new Error("no archive data");

  const tempSum = Array(13).fill(0);
  const tempCount = Array(13).fill(0);
  const precipSum = Array(13).fill(0);
  const years = new Set<string>();

  daily.time.forEach((t, i) => {
    const month = Number(t.slice(5, 7));
    years.add(t.slice(0, 4));
    const temp = daily.temperature_2m_mean[i];
    const precip = daily.precipitation_sum[i];
    if (temp != null) {
      tempSum[month] += temp;
      tempCount[month] += 1;
    }
    if (precip != null) precipSum[month] += precip;
  });

  const numYears = years.size || 1;
  return Array.from({ length: 12 }, (_, k) => {
    const month = k + 1;
    return {
      month,
      avgTempC: tempCount[month] ? tempSum[month] / tempCount[month] : NaN,
      avgPrecipMm: precipSum[month] / numYears,
    };
  });
}

/** WMO weather code → short label + emoji, enough for a compact readout. */
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  if (code <= 99) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "—", icon: "🌡️" };
}
