/**
 * weatherService.js
 * In-memory TTL cache wrapping Open-Meteo.
 * All server-side code (homeController, farmController, etc.)
 * should call getWeather() instead of hitting Open-Meteo directly,
 * so we never fire more than 1 upstream request per cache window.
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 15 * 60 * 1000; // 15 minutes

/** @type {Map<string, { data: object, expiresAt: number }>} */
const cache = new Map();

function cacheKey(lat, lon) {
  // Round to 1 decimal place so nearby coordinates share a cache slot
  return `${Math.round(lat * 10) / 10}_${Math.round(lon * 10) / 10}`;
}

function buildSummary(tempMax, precipitation) {
  if (precipitation > 10) return "Heavy rain expected";
  if (precipitation > 3)  return "Light rain expected";
  if (precipitation > 0)  return "Slight chance of rain";
  if (tempMax > 38)       return "Very hot & dry";
  if (tempMax > 32)       return "Hot & sunny";
  if (tempMax > 25)       return "Warm & clear";
  if (tempMax > 18)       return "Pleasant";
  return "Cool & clear";
}

function weatherRiskScore(tempMax, precipitation) {
  let score = 0;
  if (tempMax > 40)        score += 40;
  else if (tempMax > 35)   score += 20;
  if (precipitation > 15)  score += 40;
  else if (precipitation > 5) score += 20;
  return Math.min(score, 100);
}

/**
 * Fetch weather from Open-Meteo (or return cached value).
 * @param {number} lat
 * @param {number} lon
 * @param {string} [timezone]
 * @returns {Promise<WeatherSnapshot>}
 */
export async function getWeather(lat = 28.6, lon = 77.2, timezone = "Asia/Kolkata") {
  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      dataAgeSeconds: Math.round((now - cached.fetchedAt) / 1000),
      stale: false,
      fromCache: true,
    };
  }

  const params = new URLSearchParams({
    latitude:  String(lat),
    longitude: String(lon),
    current:   "temperature_2m,precipitation",
    daily:     "temperature_2m_max,precipitation_sum",
    timezone,
  });

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 10_000);

  let raw;
  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    raw = await res.json();
  } finally {
    clearTimeout(tid);
  }

  const tempMax       = raw.daily?.temperature_2m_max?.[0] ?? 30;
  const precipitation = raw.daily?.precipitation_sum?.[0] ?? 0;
  const currentTemp   = raw.current?.temperature_2m ?? tempMax;
  const currentPrecip = raw.current?.precipitation ?? 0;
  const unit          = raw.current_units?.temperature_2m || "°C";

  const snapshot = {
    tempCurrent:   Math.round(currentTemp),
    tempMax:       Math.round(tempMax),
    precipitation: Math.round(currentPrecip * 10) / 10,
    unit,
    summary:       buildSummary(tempMax, precipitation),
    weatherRisk:   weatherRiskScore(tempMax, precipitation),
    forecast: (raw.daily?.time || []).map((date, i) => ({
      date,
      tempMax:       Math.round(raw.daily.temperature_2m_max[i]),
      precipitation: Math.round((raw.daily.precipitation_sum[i] ?? 0) * 10) / 10,
    })),
    generatedAt:    new Date().toISOString(),
    validUntil:     new Date(now + TTL_MS).toISOString(),
    dataAgeSeconds: 0,
    stale:          false,
    fromCache:      false,
  };

  cache.set(key, { data: snapshot, expiresAt: now + TTL_MS, fetchedAt: now });
  return snapshot;
}

/**
 * Return stale cached data if available (for resilience when upstream is down).
 */
export function getWeatherStale(lat = 28.6, lon = 77.2) {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (!cached) return null;
  return {
    ...cached.data,
    dataAgeSeconds: Math.round((Date.now() - cached.fetchedAt) / 1000),
    stale: true,
    fromCache: true,
  };
}
