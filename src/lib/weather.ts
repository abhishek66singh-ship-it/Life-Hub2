import { useEffect, useState, useCallback, useMemo } from "react";
import { parseISO, todayISO, addDays, dayShort } from "./dates";
import type { WeatherDay } from "../types";

interface WeatherState {
  weather: WeatherDay[];
  city: string;
  loading: boolean;
  error: string | null;
  setLocation: (lat: number, lon: number, cityName?: string) => Promise<void>;
  searchCity: (query: string) => Promise<{ name: string; lat: number; lon: number; country: string }[]>;
}

// Default to New Delhi, India
const DEFAULT_LAT = 28.6139;
const DEFAULT_LON = 77.2090;
const DEFAULT_CITY = "New Delhi, India";

const STORAGE_KEY = "weather.location";

interface SavedLocation {
  lat: number;
  lon: number;
  city: string;
}

function loadSavedLocation(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLocation;
    if (typeof parsed.lat === "number" && typeof parsed.lon === "number" && typeof parsed.city === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveLocation(loc: SavedLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    /* ignore quota / private mode */
  }
}

const CONDITION_MAP: Record<number, WeatherDay["condition"]> = {
  0: "sunny",
  1: "partly",
  2: "partly",
  3: "cloudy",
  45: "cloudy",
  48: "cloudy",
  51: "rain",
  53: "rain",
  55: "rain",
  56: "rain",
  57: "rain",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "rain",
  67: "rain",
  71: "cloudy",
  73: "cloudy",
  75: "cloudy",
  77: "cloudy",
  80: "rain",
  81: "rain",
  82: "rain",
  85: "cloudy",
  86: "cloudy",
  95: "storm",
  96: "storm",
  99: "storm",
};

/** Reverse geocode lat/lon to a city name using Open-Meteo's geocoding API. */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&count=1`
    );
    if (!res.ok) return DEFAULT_CITY;
    const data = await res.json();
    const place = data?.results?.[0];
    if (place?.name) {
      const country = place.country_code || "";
      if (country === "IN") return `${place.name}, India`;
      return country ? `${place.name}, ${country}` : place.name;
    }
    return DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}

/** Search for cities by name using Open-Meteo's geocoding API. */
export async function searchCities(query: string): Promise<{ name: string; lat: number; lon: number; country: string; admin1?: string }[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results) return [];

    // Sort to prioritize India results
    return data.results
      .map((r: { name: string; latitude: number; longitude: number; country: string; country_code?: string; admin1?: string }) => ({
        name: r.name,
        lat: r.latitude,
        lon: r.longitude,
        country: r.country_code || r.country,
        admin1: r.admin1,
      }))
      .sort((a: { country: string }, b: { country: string }) => {
        // Prioritize India (IN) results
        if (a.country === "IN" && b.country !== "IN") return -1;
        if (b.country === "IN" && a.country !== "IN") return 1;
        return 0;
      });
  } catch {
    return [];
  }
}

/** Fetch 3-day forecast from Open-Meteo (free, no API key). */
async function fetchWeather(lat: number, lon: number): Promise<WeatherDay[]> {
  const today = todayISO();
  const startDate = today;
  const endDate = addDays(today, 2);

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&hourly=precipitation_probability&timezone=auto` +
      `&start_date=${startDate}&end_date=${endDate}`
  );

  if (!res.ok) throw new Error(`Weather API error (${res.status})`);
  const data = await res.json();

  const daily = data.daily;
  const hourly = data.hourly;
  const dailyTimes: string[] = daily.time;
  const todayHourlyDates: string[] = hourly.time;

  // Find the hour with the highest precipitation probability today for the "rain around X PM" line
  let maxRainHour: number | undefined;
  let maxRainProb = 0;
  for (let i = 0; i < todayHourlyDates.length; i++) {
    const hDate = todayHourlyDates[i];
    const hDay = hDate.split("T")[0];
    if (hDay === today) {
      const prob = hourly.precipitation_probability[i] ?? 0;
      if (prob > maxRainProb) {
        maxRainProb = prob;
        maxRainHour = Number(hDate.split("T")[1].split(":")[0]);
      }
    }
  }

  const days: WeatherDay[] = [];
  for (let i = 0; i < dailyTimes.length; i++) {
    const d = parseISO(dailyTimes[i]);
    const code = daily.weather_code[i] ?? 0;
    const rainChance = daily.precipitation_probability_max[i] ?? 0;
    days.push({
      day: i === 0 ? "Today" : dayShort(d),
      date: d.getDate(),
      tempHigh: Math.round(daily.temperature_2m_max[i] ?? 0),
      tempLow: Math.round(daily.temperature_2m_min[i] ?? 0),
      condition: CONDITION_MAP[code] ?? "partly",
      rainChance,
      isToday: i === 0,
      rainHour: i === 0 && maxRainProb >= 40 ? maxRainHour : undefined,
    });
  }

  return days;
}

/** Hook that fetches live weather, using browser geolocation with a fallback. */
export function useLiveWeather(): WeatherState {
  // Initialize from saved location if present, else default
  const saved = useMemo(() => loadSavedLocation(), []);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [city, setCity] = useState(saved?.city ?? DEFAULT_CITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    saved ? { lat: saved.lat, lon: saved.lon } : null
  );
  const [geoPermissionAsked, setGeoPermissionAsked] = useState(false);

  const loadWithCoords = useCallback(async (lat: number, lon: number, cityName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [w, c] = await Promise.all([
        fetchWeather(lat, lon),
        cityName ? Promise.resolve(cityName) : reverseGeocode(lat, lon),
      ]);
      setWeather(w);
      setCity(c);
      setCoords({ lat, lon });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  const setLocation = useCallback(async (lat: number, lon: number, cityName?: string) => {
    await loadWithCoords(lat, lon, cityName);
    const resolvedCity = cityName ?? (await reverseGeocode(lat, lon));
    saveLocation({ lat, lon, city: resolvedCity });
  }, [loadWithCoords]);

  const searchCity = useCallback(async (query: string) => {
    return searchCities(query);
  }, []);

  // Initial load — if we have a saved location, use it directly (no geolocation prompt).
  // Otherwise try geolocation once, falling back to the default city.
  useEffect(() => {
    if (geoPermissionAsked) return;

    let cancelled = false;

    const init = async () => {
      // Saved location takes priority — user previously chose this spot.
      if (saved) {
        await loadWithCoords(saved.lat, saved.lon, saved.city);
        return;
      }

      // No saved location: try geolocation once.
      if (navigator.geolocation) {
        setGeoPermissionAsked(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            await loadWithCoords(lat, lon);
            const c = await reverseGeocode(lat, lon);
            saveLocation({ lat, lon, city: c });
          },
          async () => {
            if (cancelled) return;
            await loadWithCoords(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
            saveLocation({ lat: DEFAULT_LAT, lon: DEFAULT_LON, city: DEFAULT_CITY });
          },
          { timeout: 8000, maximumAge: 600_000 }
        );
      } else {
        await loadWithCoords(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
        saveLocation({ lat: DEFAULT_LAT, lon: DEFAULT_LON, city: DEFAULT_CITY });
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [geoPermissionAsked, loadWithCoords, saved]);

  return { weather, city, loading, error, setLocation, searchCity };
}
