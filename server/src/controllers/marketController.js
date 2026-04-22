import { env } from "../config/env.js";

const MANDI_API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

function mapPriceRecord(record) {
  return {
    state: record.state || "",
    district: record.district || "",
    market: record.market || "",
    commodity: record.commodity || "",
    variety: record.variety || "",
    grade: record.grade || "",
    arrivalDate: record.arrival_date || "",
    minPrice: String(record.min_price ?? "0"),
    maxPrice: String(record.max_price ?? "0"),
    modalPrice: String(record.modal_price ?? "0"),
  };
}

async function fetchMandiRecords({ state, commodity }) {
  const params = new URLSearchParams({
    "api-key": env.MANDI_API_KEY,
    format: "json",
    limit: "100",
  });

  if (state) {
    params.set("filters[state.keyword]", state);
  }

  if (commodity) {
    params.set("filters[commodity]", commodity);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${MANDI_API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mandi API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return Array.isArray(data.records) ? data.records : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getMarketPrices(req, res, next) {
  try {
    if (!env.MANDI_API_KEY) {
      return res.status(503).json({
        message: "MANDI_API_KEY is missing in server environment",
        prices: [],
      });
    }

    const q = (req.query.q || "").toString().trim().toLowerCase();
    const state = (req.query.state || "").toString().trim();
    const commodity = (req.query.commodity || "").toString().trim();

    const records = await fetchMandiRecords({ state, commodity });
    const mapped = records.map(mapPriceRecord);

    const filtered = !q
      ? mapped
      : mapped.filter((item) => {
          return (
            item.commodity.toLowerCase().includes(q) ||
            item.market.toLowerCase().includes(q) ||
            item.district.toLowerCase().includes(q) ||
            item.state.toLowerCase().includes(q)
          );
        });

    return res.status(200).json({
      prices: filtered,
      source: "data.gov.in",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}
