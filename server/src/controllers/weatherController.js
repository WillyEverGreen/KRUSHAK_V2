/* ─── Open-Meteo Weather Controller ───────────────────────────────────────
   Free, no-key API: https://open-meteo.com/
   Returns today's max temperature and precipitation for the given coordinates,
   with sensible defaults (New Delhi) when none are supplied.
──────────────────────────────────────────────────────────────────────────── */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/** Map a precipitation value (mm) + temperature to a short weather summary */
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

/** Compute a simple weather-risk score (0-100) for the farm dashboard */
function weatherRisk(tempMax, precipitation) {
  let score = 0;
  if (tempMax > 40)      score += 40;
  else if (tempMax > 35) score += 20;
  if (precipitation > 15) score += 40;
  else if (precipitation > 5) score += 20;
  return Math.min(score, 100);
}

export async function getWeather(req, res, next) {
  try {
    const lat = Number(req.query.lat ?? 28.6);   // default: New Delhi
    const lon = Number(req.query.lon ?? 77.2);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: "Invalid lat/lon parameters." });
    }

    const params = new URLSearchParams({
      latitude:  String(lat),
      longitude: String(lon),
      daily:     "temperature_2m_max,precipitation_sum",
      timezone:  req.query.timezone || "Asia/Kolkata",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let data;
    try {
      const response = await fetch(`${OPEN_METEO_URL}?${params}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const txt = await response.text();
        console.error("[Weather] Open-Meteo error:", response.status, txt.slice(0, 200));
        return res.status(502).json({ message: "Weather service unavailable." });
      }
      data = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }

    // Open-Meteo returns parallel arrays; index 0 = today
    const tempMax      = data.daily?.temperature_2m_max?.[0] ?? null;
    const precipitation = data.daily?.precipitation_sum?.[0] ?? 0;

    if (tempMax === null) {
      return res.status(502).json({ message: "No weather data returned." });
    }

    return res.status(200).json({
      tempMax:      Math.round(tempMax),
      precipitation: Math.round(precipitation * 10) / 10,
      unit:         data.daily_units?.temperature_2m_max || "°C",
      summary:      buildSummary(tempMax, precipitation),
      weatherRisk:  weatherRisk(tempMax, precipitation),
      // Surface the 7-day forecast for potential future use
      forecast: (data.daily?.time || []).map((date, i) => ({
        date,
        tempMax:       Math.round(data.daily.temperature_2m_max[i]),
        precipitation: Math.round((data.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      })),
    });
  } catch (error) {
    return next(error);
  }
}
