import { z } from "zod";
import { Reminder } from "../models/Reminder.js";
import { ScanRecord } from "../models/ScanRecord.js";
import { getWeatherStale } from "../services/weatherService.js";

/* ─── Weather-aware livestock tips ─────────────────────────────────────── */
function buildLivestockTips(weather) {
  const temp = weather?.tempMax ?? 28;
  const rain = weather?.precipitation ?? 0;
  const tips = [];

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
  task:       z.string().min(2),
  dueAtLabel: z.string().min(2),
});

export async function getFarmData(req, res, next) {
  try {
    let reminders = [];
    let latestDiagnosis = "No recent diagnosis yet";

    if (req.user) {
      reminders = await Reminder.find({ userId: req.user.sub })
        .sort({ createdAt: -1 })
        .limit(10);

      const recentScan = await ScanRecord.findOne({ userId: req.user.sub }).sort({ createdAt: -1 });
      if (recentScan) {
        latestDiagnosis = `Latest: ${recentScan.diseaseName} (${Math.round(recentScan.confidence * 100)}%)`;
      }
    }

    /* Demo reminders when user has none */
    const isDemo = reminders.length === 0;
    if (isDemo) {
      reminders = [
        { _id: "demo-1", task: "Inspect plants for pests", dueAtLabel: "6:00 AM", done: false },
        { _id: "demo-2", task: "Apply fertilizer to wheat field", dueAtLabel: "8:00 AM", done: false },
        { _id: "demo-3", task: "Check irrigation channels", dueAtLabel: "4:00 PM", done: false },
      ];
    }

    /* Best-effort weather for annotations */
    const weather = getWeatherStale(28.6, 77.2);
    const annotated = annotateReminders(reminders, weather);
    const livestock = buildLivestockTips(weather);

    return res.status(200).json({
      latestDiagnosis,
      reminders: annotated,
      isDemo,
      livestockTips: livestock,
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
