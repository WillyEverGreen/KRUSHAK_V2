import { Reminder } from "../models/Reminder.js";
import { ScanRecord } from "../models/ScanRecord.js";
import { User } from "../models/User.js";

export async function getAdminSummary(_req, res, next) {
  try {
    const [userCount, reminderCount, scanCount] = await Promise.all([
      User.countDocuments(),
      Reminder.countDocuments(),
      ScanRecord.countDocuments(),
    ]);

    return res.status(200).json({
      metrics: {
        users: userCount,
        reminders: reminderCount,
        scans: scanCount,
      },
      note: "Admin analytics endpoint for operational monitoring.",
    });
  } catch (error) {
    return next(error);
  }
}
