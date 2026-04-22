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

export async function fetchWeather({ latitude, longitude, timezone } = {}) {
  const cacheKey = `weather_${latitude ?? "def"}_${longitude ?? "def"}`;
  return withOfflineFallback(cacheKey, async () => {
    const params = {};
    if (typeof latitude === "number")  params.lat = latitude;
    if (typeof longitude === "number") params.lon = longitude;
    if (timezone) params.timezone = timezone;
    const { data } = await http.get("/weather", { params });
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

export async function fetchCrops({ lat, lon } = {}) {
  return withOfflineFallback("crops", async () => {
    const params = {};
    if (typeof lat === "number") params.lat = lat;
    if (typeof lon === "number") params.lon = lon;
    const { data } = await http.get("/farm/crops", { params });
    return data;
  });
}

export async function addCrop(payload) {
  const { data } = await http.post("/farm/crops", payload);
  return data.crop;
}

export async function updateCrop(id, payload) {
  const { data } = await http.patch(`/farm/crops/${id}`, payload);
  return data.crop;
}

export async function deleteCrop(id) {
  const { data } = await http.delete(`/farm/crops/${id}`);
  return data.success;
}

export async function fetchDiseaseAdvisory() {
  return withOfflineFallback("disease_advisory", async () => {
    const { data } = await http.get("/diagnose/advisory");
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
    return data;
  });
}

export async function fetchNews({
  scope = "global",
  location = "India",
  latitude,
  longitude,
} = {}) {
  const cacheKey = `news_v2_${scope}_${location}_${latitude ?? "na"}_${longitude ?? "na"}`;


  return withOfflineFallback(cacheKey, async () => {
    const params = {
      scope,
      location,
    };

    if (typeof latitude === "number" && typeof longitude === "number") {
      params.lat = latitude;
      params.lon = longitude;
    }

    const { data } = await http.get("/news", { params });
    return {
      articles: data.articles || [],
      scope: data.scope || scope,
      resolvedLocation: data.resolvedLocation || location,
    };
  });
}

export async function fetchChatSuggestions() {
  const { data } = await http.get("/chat/suggestions");
  return data.suggestions || [];
}

export async function sendChatMessage({ message, history = [] }) {
  const { data } = await http.post("/chat/message", { message, history });
  return data.reply;
}
