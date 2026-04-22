import { Router } from "express";
import { getHomeData } from "../controllers/homeController.js";
import {
  analyzePlantImage,
  createScanRecord,
  getDiseaseCatalog,
  getDiseaseAdvisory,
  getRecentDiagnoses,
} from "../controllers/diagnoseController.js";
import {
  addReminder,
  addLivestock,
  addLivestockFeedReminder,
  deleteReminder,
  deleteLivestock,
  getFarmData,
  getLivestock,
  toggleReminder,
  updateLivestock,
} from "../controllers/farmController.js";
import {
  getCrops,
  addCrop,
  updateCrop,
  deleteCrop,
} from "../controllers/cropController.js";
import { getMarketPrices } from "../controllers/marketController.js";
import { getNews } from "../controllers/newsController.js";
import { getWeather } from "../controllers/weatherController.js";
import {
  getChatSuggestions,
  sendChatMessage,
} from "../controllers/chatController.js";
import { getAdminSummary } from "../controllers/adminController.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/* ── Home ─────────────────────────────────────────────────────────────── */
router.get("/home", optionalAuth, getHomeData);

/* ── Diagnose ─────────────────────────────────────────────────────────── */
router.get("/diagnose/catalog",  getDiseaseCatalog);
router.get("/diagnose/advisory", getDiseaseAdvisory);
router.post("/diagnose/analyze", optionalAuth, analyzePlantImage);
router.get("/diagnose/recent",   optionalAuth, getRecentDiagnoses);
router.post("/diagnose/records", requireAuth, createScanRecord);

/* ── Farm (reminders + overview) ─────────────────────────────────────── */
router.get("/farm",                          optionalAuth, getFarmData);
router.post("/farm/reminders",               requireAuth,  addReminder);
router.patch("/farm/reminders/:id/toggle",   requireAuth,  toggleReminder);
router.delete("/farm/reminders/:id",         requireAuth,  deleteReminder);
router.get("/farm/livestock",                requireAuth,  getLivestock);
router.post("/farm/livestock",               requireAuth,  addLivestock);
router.patch("/farm/livestock/:id",          requireAuth,  updateLivestock);
router.delete("/farm/livestock/:id",         requireAuth,  deleteLivestock);
router.post("/farm/livestock/:id/feed-reminder", requireAuth, addLivestockFeedReminder);

/* ── Crops (user's registered crop list) ─────────────────────────────── */
router.get("/farm/crops",        optionalAuth, getCrops);   // demo crops when logged out
router.post("/farm/crops",       requireAuth,  addCrop);
router.patch("/farm/crops/:id",  requireAuth,  updateCrop);
router.delete("/farm/crops/:id", requireAuth,  deleteCrop);

/* ── Market ───────────────────────────────────────────────────────────── */
router.get("/market/prices", getMarketPrices);

/* ── News & Weather ───────────────────────────────────────────────────── */
router.get("/news",    getNews);
router.get("/weather", getWeather);

/* ── Chat ─────────────────────────────────────────────────────────────── */
router.get("/chat/suggestions", getChatSuggestions);
router.post("/chat/message",    sendChatMessage);

/* ── Admin ────────────────────────────────────────────────────────────── */
router.get("/admin/summary", requireAuth, requireRole("admin"), getAdminSummary);

export default router;
