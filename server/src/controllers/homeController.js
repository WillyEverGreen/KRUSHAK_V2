import { ScanRecord } from "../models/ScanRecord.js";

export async function getHomeData(req, res, next) {
  try {
    const recent = req.user
      ? await ScanRecord.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(1)
      : [];

    const latest = recent[0];

    const payload = {
      greeting: "Good Morning",
      dashboardTitle: "KisanAI Dashboard",
      location: "Pune, Maharashtra",
      weather: {
        value: "31C",
        summary: "Partly cloudy",
      },
      instructions: [
        "Check irrigation level in morning and avoid overwatering.",
        "Inspect lower leaves for early pest signs before noon.",
        "Plan fertilizer for tomorrow if rain probability is low.",
      ],
      riskMeters: {
        waterStress: 25,
        pestAlert: 50,
        weatherRisk: 40,
      },
      villageAlert:
        "Pest activity rising in nearby farms. Inspect mustard and tomato leaves today.",
      latestDiagnosis: latest
        ? `${latest.diseaseName} (${Math.round(latest.confidence * 100)}%)`
        : "No recent diagnosis yet",
    };

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}
