import { Router } from "express";
import { getHomeData } from "../controllers/homeController.js";
import {
  createScanRecord,
  getDiseaseCatalog,
  getRecentDiagnoses,
} from "../controllers/diagnoseController.js";
import {
  addReminder,
  deleteReminder,
  getFarmData,
  toggleReminder,
} from "../controllers/farmController.js";
import { getMarketPrices } from "../controllers/marketController.js";
import { getNews } from "../controllers/newsController.js";
import { getChatSuggestions, sendChatMessage } from "../controllers/chatController.js";
import { getAdminSummary } from "../controllers/adminController.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/home", optionalAuth, getHomeData);

router.get("/diagnose/catalog", getDiseaseCatalog);
router.get("/diagnose/recent", optionalAuth, getRecentDiagnoses);
router.post("/diagnose/records", requireAuth, createScanRecord);

router.get("/farm", optionalAuth, getFarmData);
router.post("/farm/reminders", requireAuth, addReminder);
router.patch("/farm/reminders/:id/toggle", requireAuth, toggleReminder);
router.delete("/farm/reminders/:id", requireAuth, deleteReminder);

router.get("/market/prices", getMarketPrices);
router.get("/news", getNews);

router.get("/chat/suggestions", getChatSuggestions);
router.post("/chat/message", sendChatMessage);

router.get("/admin/summary", requireAuth, requireRole("admin"), getAdminSummary);

export default router;
