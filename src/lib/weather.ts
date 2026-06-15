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
    "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code"
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
  };
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
