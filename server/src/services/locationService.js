/**
 * locationService.js
 * In-memory TTL cache wrapping BigDataCloud Reverse Geocoding API.
 */

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const TTL_MS = 60 * 60 * 1000; // 1 hour cache per location

/** @type {Map<string, { name: string, expiresAt: number }>} */
const cache = new Map();

function cacheKey(lat, lon) {
  // Round to 2 decimal places (approx 1.1km accuracy) so nearby requests hit the cache
  return `${Math.round(lat * 100) / 100}_${Math.round(lon * 100) / 100}`;
}

/**
 * Fetch precise location name using reverse geocoding (or return cached value).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
export async function getLocationName(lat = 28.6, lon = 77.2) {
  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.name;
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    localityLanguage: "en",
  });

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`${REVERSE_GEOCODE_URL}?${params}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    
    if (!res.ok) throw new Error(`Geocoding failed ${res.status}`);
    
    const data = await res.json();
    
    // Construct a readable location string
    // BigDataCloud provides locality, principalSubdivision, and city.
    // E.g., Borivali, Maharashtra, India or Mumbai, Maharashtra, India.
    const parts = [];
    if (data.locality && data.locality !== data.city) parts.push(data.locality);
    if (data.city) parts.push(data.city);
    else if (data.principalSubdivision) parts.push(data.principalSubdivision);
    
    if (parts.length === 0) {
      parts.push(data.countryName || "India");
    }

    const locationName = parts.join(", ");
    
    cache.set(key, { name: locationName, expiresAt: now + TTL_MS });
    return locationName;
  } catch (err) {
    console.error("[LocationService] Reverse Geocoding Error:", err.message);
    // Fallback gracefully
    return "Location unavailable";
  } finally {
    clearTimeout(tid);
  }
}
