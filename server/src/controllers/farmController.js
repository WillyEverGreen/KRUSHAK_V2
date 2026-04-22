import { z } from "zod";
import { Reminder } from "../models/Reminder.js";
import { ScanRecord } from "../models/ScanRecord.js";
import { Livestock, LIVESTOCK_TYPES } from "../models/Livestock.js";
import { Crop } from "../models/Crop.js";
import { getWeatherStale } from "../services/weatherService.js";

/* ─── Quick reminder templates (API-backed hints for UI) ──────────────── */
const QUICK_REMINDER_TEMPLATES = [
  {
    id: "irrigation-evening",
    title: "Irrigation Check",
    task: "Check irrigation channels and moisture",
    dueAtLabel: "Today 6:00 PM",
    category: "irrigation",
    priority: "medium",
  },
  {
    id: "spray-morning",
    title: "Pest Spray",
    task: "Inspect pest level and prepare spray",
    dueAtLabel: "Tomorrow 6:00 AM",
    category: "spray",
    priority: "high",
  },
  {
    id: "feed-livestock",
    title: "Feed Livestock",
    task: "Feed livestock and refill water trough",
    dueAtLabel: "Today 7:00 PM",
    category: "livestock-feed",
    priority: "high",
  },
  {
    id: "farm-walk",
    title: "Morning Walkthrough",
    task: "Morning field walk and disease inspection",
    dueAtLabel: "Tomorrow 6:30 AM",
    category: "crop",
    priority: "medium",
  },
];

/* ─── Weather-aware livestock tips ────────────────────────────────────── */
function buildLivestockTips(weather, livestockList) {
  const temp = weather?.tempMax ?? 28;
  const rain = weather?.precipitation ?? 0;
  const totalAnimals = livestockList.reduce((sum, item) => sum + (item.count || 0), 0);
  const tips = [];

  if (totalAnimals > 0) {
    tips.push({
      title: "Livestock Count",
      tip: `You are tracking ${totalAnimals} animals. Keep feed and water logs updated daily for stable health trends.`,
    });
  }

  if (temp > 40) {
    tips.push({
      title: "Heat Stress Alert 🌡️",
      tip: `Temperature is ${temp}°C — provide shade and ensure livestock have fresh water every 2–3 hours.`,
    });
  } else if (temp > 35) {
    tips.push({
      title: "Warm Day Management",
      tip: "Avoid strenuous activities for livestock in the afternoon. Supplement electrolytes in drinking water.",
    });
  } else {
    tips.push({
      title: "Cow Dung Compost",
      tip: "Mix with crop residue for 30 days for rich organic fertilizer.",
    });
  }

  if (rain > 5) {
    tips.push({
      title: "Wet Weather Care",
      tip: "Ensure proper shelter — wet conditions increase risk of hoof rot and respiratory infections.",
    });
  } else {
    tips.push({
      title: "Cow Urine Spray",
      tip: "Dilute 1:10 with water and use as natural pest repellent on crop leaves.",
    });
  }

  return tips;
}

/* ─── Weather-aware reminder annotation ────────────────────────────────── */
function annotateReminders(reminders, weather) {
  const rain = weather?.precipitation ?? 0;
  const rainSoon = rain > 3 || (weather?.forecast?.[1]?.precipitation ?? 0) > 3;

  return reminders.map((r) => {
    const task = (r.task || "").toLowerCase();
    let skipWarning = null;
    if (rainSoon && (task.includes("fertilizer") || task.includes("spray") || task.includes("pesticide"))) {
      skipWarning = "⚠️ Rain expected — consider postponing";
    }
    if (rain > 10 && (task.includes("irrigat") || task.includes("water"))) {
      skipWarning = "⚠️ Heavy rain today — irrigation likely not needed";
    }
    return { ...r.toObject?.() ?? r, skipWarning };
  });
}

const reminderInputSchema = z.object({
  task: z.string().min(2),
  dueAtLabel: z.string().min(2).default("Today 6:00 PM"),
  category: z
    .enum([
      "general",
      "crop",
      "irrigation",
      "spray",
      "harvest",
      "livestock-feed",
      "livestock-health",
    ])
    .default("general"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  targetType: z.string().optional().default(""),
  targetId: z.string().optional().default(""),
});

const livestockInputSchema = z.object({
  type: z.enum(LIVESTOCK_TYPES),
  name: z.string().max(60).optional().default(""),
  count: z.coerce.number().min(1).max(10000).default(1),
  healthScore: z.coerce.number().min(0).max(1).default(0.8),
  lastFedAtLabel: z.string().max(80).optional().default(""),
  feedIntervalHours: z.coerce.number().min(1).max(48).default(12),
  notes: z.string().max(500).optional().default(""),
});

const livestockUpdateSchema = livestockInputSchema.partial();

const feedReminderInputSchema = z.object({
  dueAtLabel: z.string().min(2).default("Today 7:00 PM"),
});

export async function getFarmData(req, res, next) {
  try {
    let reminders = [];
    let latestDiagnosis = "No recent diagnosis yet";
    let livestock = [];
    let cropCards = [];

    if (req.user) {
      const [dbReminders, recentScan, livestockDocs, crops] = await Promise.all([
        Reminder.find({ userId: req.user.sub })
          .sort({ done: 1, createdAt: -1 })
          .limit(25),
        ScanRecord.findOne({ userId: req.user.sub }).sort({ createdAt: -1 }),
        Livestock.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(30),
        Crop.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(12),
      ]);

      reminders = dbReminders;
      livestock = livestockDocs.map((item) => ({
        _id: item._id,
        type: item.type,
        name: item.name,
        count: item.count,
        healthScore: item.healthScore,
        lastFedAtLabel: item.lastFedAtLabel,
        feedIntervalHours: item.feedIntervalHours,
        notes: item.notes,
        createdAt: item.createdAt,
      }));

      cropCards = crops.map((crop) => ({
        _id: crop._id,
        name: crop.name,
        stage: crop.stage,
      }));

      if (recentScan) {
        latestDiagnosis = `Latest: ${recentScan.diseaseName} (${Math.round(recentScan.confidence * 100)}%)`;
      }
    }

    /* Best-effort weather for annotations */
    const weather = getWeatherStale(28.6, 77.2);
    const annotated = annotateReminders(reminders, weather);
    const livestockTips = buildLivestockTips(weather, livestock);

    return res.status(200).json({
      latestDiagnosis,
      reminders: annotated,
      livestock,
      livestockTips,
      cropCards,
      quickReminderTemplates: QUICK_REMINDER_TEMPLATES,
      generatedAt: new Date().toISOString(),
      weatherSummary: weather ? `${weather.tempMax}°C · ${weather.summary}` : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function addReminder(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const payload = reminderInputSchema.parse(req.body);
    const reminder = await Reminder.create({
      userId: req.user.sub,
      task: payload.task,
      dueAtLabel: payload.dueAtLabel,
      category: payload.category,
      priority: payload.priority,
      targetType: payload.targetType,
      targetId: payload.targetId,
      done: false,
    });
    return res.status(201).json({ reminder });
  } catch (error) {
    return next(error);
  }
}

export async function toggleReminder(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });
    reminder.done = !reminder.done;
    await reminder.save();
    return res.status(200).json({ reminder });
  } catch (error) {
    return next(error);
  }
}

export async function deleteReminder(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const deleted = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!deleted) return res.status(404).json({ message: "Reminder not found" });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

export async function getLivestock(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const livestock = await Livestock.find({ userId: req.user.sub }).sort({ createdAt: -1 });
    return res.status(200).json({ livestock });
  } catch (error) {
    return next(error);
  }
}

export async function addLivestock(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const payload = livestockInputSchema.parse(req.body);
    const livestock = await Livestock.create({
      userId: req.user.sub,
      type: payload.type,
      name: payload.name,
      count: payload.count,
      healthScore: payload.healthScore,
      lastFedAtLabel: payload.lastFedAtLabel,
      feedIntervalHours: payload.feedIntervalHours,
      notes: payload.notes,
    });
    return res.status(201).json({ livestock });
  } catch (error) {
    return next(error);
  }
}

export async function updateLivestock(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const payload = livestockUpdateSchema.parse(req.body);

    const livestock = await Livestock.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      { $set: payload },
      { new: true },
    );

    if (!livestock) {
      return res.status(404).json({ message: "Livestock entry not found" });
    }

    return res.status(200).json({ livestock });
  } catch (error) {
    return next(error);
  }
}

export async function deleteLivestock(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const deleted = await Livestock.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Livestock entry not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

export async function addLivestockFeedReminder(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });

    const payload = feedReminderInputSchema.parse(req.body || {});
    const livestock = await Livestock.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!livestock) {
      return res.status(404).json({ message: "Livestock entry not found" });
    }

    const reminder = await Reminder.create({
      userId: req.user.sub,
      task: `Feed ${livestock.name || livestock.type} (${livestock.count})`,
      dueAtLabel: payload.dueAtLabel,
      category: "livestock-feed",
      priority: "high",
      targetType: "livestock",
      targetId: livestock._id.toString(),
      done: false,
    });

    return res.status(201).json({ reminder });
  } catch (error) {
    return next(error);
  }
}
