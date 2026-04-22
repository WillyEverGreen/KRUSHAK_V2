import { z } from "zod";
import { Crop, STAGES } from "../models/Crop.js";
import { getWeather, getWeatherStale } from "../services/weatherService.js";

const cropInputSchema = z.object({
  name:           z.string().min(2).max(60),
  variety:        z.string().max(60).default(""),
  stage:          z.enum(STAGES).default("Sowing"),
  sowingDate:     z.string().optional().nullable(),
  fieldSizeAcres: z.coerce.number().min(0.1).max(10000).default(1),
  notes:          z.string().max(500).default(""),
});

/** Compute a 0–1 health score from stage + weather */
function computeHealth(crop, weather) {
  const stageIndex = STAGES.indexOf(crop.stage);
  // Base health by stage progress (healthy mid-season)
  const stageHealth = [0.6, 0.7, 0.85, 0.9, 0.88, 0.75][stageIndex] ?? 0.75;

  // Penalise for extreme weather
  let penalty = 0;
  if (weather) {
    if (weather.tempMax > 42)           penalty += 0.15;
    else if (weather.tempMax > 38)      penalty += 0.05;
    if (weather.precipitation > 20)     penalty += 0.1;
  }

  return Math.max(0.3, Math.min(1, stageHealth - penalty));
}

/** Suggest an action based on stage + weather */
function suggestAction(crop, weather) {
  const stage = crop.stage;
  const rain  = weather?.precipitation ?? 0;
  const temp  = weather?.tempMax ?? 30;

  if (stage === "Sowing")       return "Ensure soil moisture for germination.";
  if (stage === "Germination")  return "Keep soil moist, avoid waterlogging.";
  if (stage === "Vegetative") {
    if (rain > 5) return "Check drainage — roots susceptible to rot.";
    if (temp > 36) return "Irrigate in the evening to cool root zone.";
    return "Apply split nitrogen dose for healthy leaf growth.";
  }
  if (stage === "Flowering") {
    if (rain > 3) return "Rain risk — avoid pesticide spray today.";
    return "Ensure phosphorus supply; avoid water stress at flowering.";
  }
  if (stage === "Fruiting")    return "Monitor for fruit borer; maintain even irrigation.";
  if (stage === "Harvest")     return "Plan transport; harvest early morning for best quality.";
  return "Inspect daily and record observations.";
}

/** List all crops */
export async function getCrops(req, res, next) {
  try {
    // Fetch weather (best-effort; don't fail if unavailable)
    let weather = null;
    try {
      const lat = Number(req.query.lat || 28.6);
      const lon = Number(req.query.lon || 77.2);
      weather = await getWeather(lat, lon);
    } catch {
      weather = getWeatherStale(28.6, 77.2);
    }

    /* No user -> no crops */
    if (!req.user) {
      return res.status(200).json({
        crops:       [],
        isDemo:      false,
        generatedAt: new Date().toISOString(),
      });
    }

    const crops = await Crop.find({ userId: req.user.sub }).sort({ createdAt: -1 });

    const enriched = crops.map((crop) => ({
      _id:            crop._id,
      name:           crop.name,
      variety:        crop.variety,
      stage:          crop.stage,
      sowingDate:     crop.sowingDate,
      fieldSizeAcres: crop.fieldSizeAcres,
      notes:          crop.notes,
      health:         computeHealth(crop, weather),
      water:          (weather?.precipitation ?? 0) > 3 ? "Rain expected" : "Check irrigation",
      action:         suggestAction(crop, weather),
      createdAt:      crop.createdAt,
    }));

    return res.status(200).json({
      crops:       enriched,
      isDemo:      false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

/** Add a new crop */
export async function addCrop(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required to save crops. Please create an account.", code: "AUTH_REQUIRED" });

    const payload = cropInputSchema.parse(req.body);
    const crop = await Crop.create({
      userId:         req.user.sub,
      name:           payload.name,
      variety:        payload.variety,
      stage:          payload.stage,
      sowingDate:     payload.sowingDate ? new Date(payload.sowingDate) : null,
      fieldSizeAcres: payload.fieldSizeAcres,
      notes:          payload.notes,
    });

    return res.status(201).json({ crop });
  } catch (error) {
    return next(error);
  }
}

/** Update a crop's stage or notes */
export async function updateCrop(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });

    const allowed = cropInputSchema.partial().parse(req.body);
    const crop = await Crop.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      { $set: allowed },
      { new: true }
    );

    if (!crop) return res.status(404).json({ message: "Crop not found" });
    return res.status(200).json({ crop });
  } catch (error) {
    return next(error);
  }
}

/** Delete a crop */
export async function deleteCrop(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });

    const deleted = await Crop.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!deleted) return res.status(404).json({ message: "Crop not found" });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}
