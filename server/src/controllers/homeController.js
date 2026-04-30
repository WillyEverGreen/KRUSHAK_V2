import { ScanRecord } from "../models/ScanRecord.js";
import { Crop } from "../models/Crop.js";
import { getWeather, getWeatherStale } from "../services/weatherService.js";
import { getTodayInstructions, getRiskMeters, getGreeting } from "../services/actionEngine.js";
import { getLocationName } from "../services/locationService.js";

export async function getHomeData(req, res, next) {
  try {
    const lat = Number(req.query.lat ?? 28.6);
    const lon = Number(req.query.lon ?? 77.2);

    /* ── 1. Live weather (with stale fallback) ──────────────────────── */
    let weather;
    let weatherStale = false;
    try {
      weather = await getWeather(
        Number.isFinite(lat) ? lat : 28.6,
        Number.isFinite(lon) ? lon : 77.2,
      );
    } catch {
      weather = getWeatherStale(lat, lon) ?? {
        tempCurrent: 30, tempMax: 30, precipitation: 0, unit: "°C",
        summary: "Weather unavailable", weatherRisk: 20,
        forecast: [], stale: true,
      };
      weatherStale = true;
    }

    /* ── 2. User's crops for crop-specific instructions ─────────────── */
    let crops = [];
    if (req.user) {
      try {
        crops = await Crop.find({ userId: req.user.sub }).limit(5).lean();
      } catch { /* non-fatal */ }
    }

    /* ── 3. Latest scan for dashboard summary ───────────────────────── */
    let latestDiagnosis = "No recent diagnosis yet";
    if (req.user) {
      try {
        const scan = await ScanRecord.findOne({ userId: req.user.sub }).sort({ createdAt: -1 }).lean();
        if (scan) latestDiagnosis = `${scan.diseaseName} (${Math.round(scan.confidence * 100)}%)`;
      } catch { /* non-fatal */ }
    }

    /* ── 4. Dynamic content from action engine ──────────────────────── */
    const instructions = getTodayInstructions(weather, crops);
    const riskMeters   = getRiskMeters(weather);
    const greeting     = getGreeting();

    /* ── 5. Location label ──────────────────────────────────────────── */
    let location = req.query.location;
    if (!location) {
      try {
        location = await getLocationName(lat, lon);
      } catch {
        location = "India";
      }
    }

    const now = new Date().toISOString();

    return res.status(200).json({
      greeting,
      dashboardTitle: "KisanAI Dashboard",
      location,
      weather: {
        value:         `${weather.tempCurrent ?? weather.tempMax}${weather.unit}`,
        summary:       weather.summary,
        precipitation: weather.precipitation,
        stale:         weatherStale || weather.stale || false,
        generatedAt:   weather.generatedAt || now,
      },
      instructions,
      riskMeters,
      latestDiagnosis,
      generatedAt: now,
      dataAgeSeconds: 0,
    });
  } catch (error) {
    return next(error);
  }
}
