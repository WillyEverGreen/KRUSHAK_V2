import { env } from "../config/env.js";

const GNEWS_API_URL = "https://gnews.io/api/v4/search";
const NEWSDATA_API_URL = "https://newsdata.io/api/1/latest";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/* ─── Agriculture relevance filter ─────────────────────────────────────── */
const AGRI_KEYWORDS = [
  "agriculture", "agricultural", "agri", "agroforestry",
  "farming", "farmer", "farmers", "farmland",
  "crop", "crops", "harvest", "harvesting", "cultivation", "cultivate",
  "soil", "compost", "mulch",
  "fertilizer", "fertiliser", "urea", "pesticide", "insecticide", "herbicide", "fungicide",
  "irrigation", "drip irrigation", "groundwater", "rainfed", "canal water",
  "mandi", "kisan", "krishi", "fasal bima", "pradhan mantri fasal",
  "wheat", "rice", "paddy", "maize", "corn", "sugarcane", "cotton",
  "soybean", "soya", "groundnut", "oilseed", "mustard", "sunflower",
  "pulse", "lentil", "chickpea", "gram", "arhar", "moong", "tur dal",
  "vegetable", "tomato", "onion", "potato", "brinjal", "okra",
  "fruit", "mango", "banana", "apple", "orange", "grape", "guava",
  "horticulture", "floriculture", "nursery", "greenhouse",
  "plant", "plantation", "seed", "sowing", "transplant", "seedling",
  "food grain", "foodgrain", "grain", "cereal", "straw",
  "livestock", "dairy", "poultry", "animal husbandry", "fisheries", "aquaculture",
  "agritech", "precision farming", "organic farming", "natural farming",
  "crop disease", "blight", "rust fungus", "pest attack", "locust",
  "monsoon", "rabi", "kharif", "zaid",
  "minimum support price", "msp", "farm income", "farm subsidy",
  "agricultural policy", "agri export", "food security", "food production",
  "forest", "biodiversity", "deforestation", "reforestation",
  "plant science", "botany", "phytology", "photosynthesis",
];

function isAgriArticle(article) {
  const haystack = `${article.title ?? ""} ${article.description ?? ""}`.toLowerCase();
  return AGRI_KEYWORDS.some((kw) => haystack.includes(kw));
}

/* ─── Location helpers ──────────────────────────────────────────────────── */

function normalizeIndianStateName(value) {
  const raw = (value || "").trim();
  if (!raw) return "India";
  const aliases = {
    maharastra: "Maharashtra",
    "nct of delhi": "Delhi",
    "new delhi": "Delhi",
    mh: "Maharashtra",
  };
  const normalized = raw.toLowerCase();
  if (aliases[normalized]) return aliases[normalized];
  if (normalized.includes("mahar")) return "Maharashtra";
  if (normalized.startsWith("state of ")) return raw.slice(9).trim() || "India";
  return raw;
}

async function resolveLocationFromCoordinates(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "krushak-pwa/1.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== "object") return null;
    const address = data.address || {};
    return normalizeIndianStateName(
      address.state || address.state_district || address.city || address.county || address.country,
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ─── GNews fetch ───────────────────────────────────────────────────────── */

async function fetchFromGNews({ scope, location }) {
  if (!env.GNEWS_API_KEY) return [];

  /* Shorter query to respect GNews free tier limit of 200 characters */
  const agriCore =
    "agriculture OR farming OR crops OR harvest OR irrigation OR mandi OR kisan OR wheat OR rice OR horticulture OR dairy OR livestock OR \"organic farming\"";

  const query = scope === "local"
    ? `"${location}" AND (farming OR crops OR agriculture)`
    : agriCore;

  // Only restrict by country for local scope; global should be unrestricted
  const gnewsParams = {
    q: query,
    lang: "en",
    max: "10",
    token: env.GNEWS_API_KEY,
  };
  if (scope === "local") gnewsParams.country = env.GNEWS_COUNTRY;

  const params = new URLSearchParams(gnewsParams);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${GNEWS_API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const txt = await response.text();
      console.error(`[GNews] ${response.status}:`, txt.slice(0, 200));
      return [];
    }
    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    return articles.map((a) => ({
      id: a.url || `gnews-${a.publishedAt}-${a.title}`,
      title: a.title || "Untitled",
      description: a.description || "",
      source: a.source?.name || "GNews",
      publishedAt: a.publishedAt || "",
      image: a.image || "",
      url: a.url || "",
      scope,
    }));
  } catch (err) {
    console.error("[GNews] fetch error:", err.message);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ─── NewsData.io fetch ─────────────────────────────────────────────────── */

async function fetchFromNewsData({ scope, location }) {
  if (!env.NEWSDATA_API_KEY) return [];

  /* NewsData query */
  const q = scope === "local"
    ? `"${location}" AND (agriculture OR farming OR crops)`
    : "agriculture OR farming OR crops OR harvest OR irrigation OR livestock";

  const params = new URLSearchParams({
    apikey: env.NEWSDATA_API_KEY,
    q,
    language: "en",
    category: "environment,science,health,business",
  });


  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${NEWSDATA_API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const txt = await response.text();
      console.error(`[NewsData] ${response.status}:`, txt.slice(0, 200));
      return [];
    }
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];

    return results.map((a) => ({
      id: a.link || `newsdata-${a.pubDate}-${a.title}`,
      title: a.title || "Untitled",
      description: a.description || a.content?.slice(0, 200) || "",
      source: a.source_id || a.source_name || "NewsData",
      publishedAt: a.pubDate || "",
      /* NewsData returns image_url */
      image: a.image_url || "",
      url: a.link || "",
      scope,
    }));
  } catch (err) {
    console.error("[NewsData] fetch error:", err.message);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ─── Merge, deduplicate & sort ─────────────────────────────────────────── */

function mergeArticles(gnewsArticles, newsdataArticles) {
  const seen = new Set();
  const merged = [];

  for (const article of [...gnewsArticles, ...newsdataArticles]) {
    /* Deduplicate by URL; also skip blanks */
    const key = (article.url || article.id || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    /* Both APIs are already queried with agriculture-specific terms,
       so we trust them and skip the strict keyword filter which was
       dropping valid articles with concise/indirect titles. */
    merged.push(article);
  }

  /* Sort newest-first; articles without dates fall to the bottom */
  merged.sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  return merged;
}

/* ─── Route handler ─────────────────────────────────────────────────────── */

export async function getNews(req, res, next) {
  try {
    if (!env.GNEWS_API_KEY && !env.NEWSDATA_API_KEY) {
      return res.status(503).json({
        message: "No news API keys configured in server environment.",
        articles: [],
      });
    }

    const scope = (req.query.scope || "global").toString().toLowerCase();
    const queryLocation = (req.query.location || "India").toString();
    const lat = req.query.lat;
    const lon = req.query.lon;

    let resolvedLocation = normalizeIndianStateName(queryLocation);
    if (scope === "local") {
      const fromCoordinates = await resolveLocationFromCoordinates(lat, lon);
      if (fromCoordinates) resolvedLocation = fromCoordinates;
    }

    /* Fetch from both sources concurrently */
    const [gnewsArticles, newsdataArticles] = await Promise.all([
      fetchFromGNews({ scope, location: resolvedLocation }),
      fetchFromNewsData({ scope, location: resolvedLocation }),
    ]);

    const articles = mergeArticles(gnewsArticles, newsdataArticles);

    return res.status(200).json({ articles, scope, resolvedLocation });
  } catch (error) {
    return next(error);
  }
}
