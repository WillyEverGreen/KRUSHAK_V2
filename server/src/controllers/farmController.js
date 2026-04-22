import { z } from "zod";
import { Reminder } from "../models/Reminder.js";
import { ScanRecord } from "../models/ScanRecord.js";

const cropCards = [
  {
    name: "Tomato",
    stage: "Flowering",
    health: 0.85,
    water: "Adequate",
    action: "Apply organic manure",
  },
  {
    name: "Wheat",
    stage: "Tillering",
    health: 0.7,
    water: "Low",
    action: "Check for mildew",
  },
  {
    name: "Rice",
    stage: "Booting",
    health: 0.92,
    water: "Adequate",
    action: "No action needed",
  },
];

const livestockTips = [
  {
    title: "Cow Dung Compost",
    tip: "Mix with crop residue for 30 days for rich organic fertilizer",
  },
  {
    title: "Cow Urine Spray",
    tip: "Dilute 1:10 with water and use as natural pest repellent",
  },
];

const reminderInputSchema = z.object({
  task: z.string().min(2),
  dueAtLabel: z.string().min(2),
});

export async function getFarmData(req, res, next) {
  try {
    let reminders = [];
    let latestDiagnosis = "No recent diagnosis yet";

    if (req.user) {
      reminders = await Reminder.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(10);
      const recentScan = await ScanRecord.findOne({ userId: req.user.sub }).sort({ createdAt: -1 });
      if (recentScan) {
        latestDiagnosis = `Latest diagnosis: ${recentScan.diseaseName} (${Math.round(recentScan.confidence * 100)}%)`;
      }
    }

    if (!reminders.length) {
      reminders = [
        { _id: "demo-1", task: "Inspect tomato plants for pests", dueAtLabel: "6:00 AM", done: false },
        { _id: "demo-2", task: "Apply cow dung fertilizer to wheat", dueAtLabel: "8:00 AM", done: false },
        { _id: "demo-3", task: "Check irrigation channels", dueAtLabel: "4:00 PM", done: false },
      ];
    }

    return res.status(200).json({
      latestDiagnosis,
      cropCards,
      reminders,
      livestockTips,
    });
  } catch (error) {
    return next(error);
  }
}

export async function addReminder(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

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
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.done = !reminder.done;
    await reminder.save();

    return res.status(200).json({ reminder });
  } catch (error) {
    return next(error);
  }
}

export async function deleteReminder(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    const deleted = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!deleted) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}
