import { http } from "./http";
import { withOfflineFallback } from "./offlineCache";

export async function login(payload) {
  const { data } = await http.post("/auth/login", payload);
  return data;
}

export async function register(payload) {
  const { data } = await http.post("/auth/register", payload);
  return data;
}

export async function fetchHomeData() {
  return withOfflineFallback("home", async () => {
    const { data } = await http.get("/home");
    return data;
  });
}

export async function fetchDiseaseCatalog(query = "") {
  const { data } = await http.get("/diagnose/catalog", {
    params: { q: query },
  });
  return data.diseases || [];
}

export async function analyzePlantImage(payload) {
  const { data } = await http.post("/diagnose/analyze", payload, {
    timeout: 45_000,
  });
  return data.analysis;
}

export async function fetchRecentDiagnoses() {
  const { data } = await http.get("/diagnose/recent");
  return data.recent || [];
}

export async function saveDiagnosisRecord(payload) {
  const { data } = await http.post("/diagnose/records", payload);
  return data.record;
}

export async function fetchFarmData() {
  return withOfflineFallback("farm", async () => {
    const { data } = await http.get("/farm");
    return data;
  });
}

export async function addReminder(payload) {
  const { data } = await http.post("/farm/reminders", payload);
  return data.reminder;
}

export async function toggleReminder(id) {
  const { data } = await http.patch(`/farm/reminders/${id}/toggle`);
  return data.reminder;
}

export async function deleteReminder(id) {
  const { data } = await http.delete(`/farm/reminders/${id}`);
  return data.success;
}

export async function fetchMarketPrices(params = {}) {
  return withOfflineFallback(`market_${JSON.stringify(params)}`, async () => {
    const { data } = await http.get("/market/prices", { params });
    return data.prices || [];
  });
}

export async function fetchNews(scope = "global", location = "maharashtra") {
  return withOfflineFallback(`news_${scope}_${location}`, async () => {
    const { data } = await http.get("/news", { params: { scope, location } });
    return data.articles || [];
  });
}

export async function fetchChatSuggestions() {
  const { data } = await http.get("/chat/suggestions");
  return data.suggestions || [];
}

export async function sendChatMessage(message) {
  const { data } = await http.post("/chat/message", { message });
  return data.reply;
}
