/**
 * actionEngine.js
 * Generates dynamic daily instructions and risk meter values
 * from live weather data + (optionally) the user's crop list.
 */

/**
 * Pick weather-appropriate farming instructions.
 * @param {object} weather  - from weatherService.getWeather()
 * @param {Array}  crops    - user's Crop documents (may be empty)
 * @returns {string[]}
 */
export function getTodayInstructions(weather, crops = []) {
  const { tempMax = 30, precipitation = 0, forecast = [] } = weather;

  // Tomorrow's rain probability from forecast[1]
  const tomorrowRain = forecast[1]?.precipitation ?? 0;
  const rainSoon     = precipitation > 3 || tomorrowRain > 3;

  const instructions = [];

  /* ── Water / Irrigation ─────────────────────────────────────────────── */
  if (precipitation === 0 && tempMax > 35) {
    instructions.push(
      "High heat & no rain — irrigate early morning or after sunset to minimize evaporation."
    );
  } else if (precipitation > 10) {
    instructions.push(
      "Heavy rain expected — skip irrigation and check field drainage to prevent waterlogging."
    );
  } else if (precipitation > 3) {
    instructions.push(
      "Light rain likely — reduce irrigation by 50% and monitor soil moisture levels."
    );
  } else if (tempMax > 30 && precipitation === 0) {
    instructions.push(
      "Warm & dry conditions — maintain regular irrigation schedule and mulch to retain soil moisture."
    );
  }

  /* ── Fertilizer timing ──────────────────────────────────────────────── */
  if (rainSoon) {
    instructions.push(
      "Rain in the forecast — postpone fertilizer or pesticide application to avoid runoff losses."
    );
  } else if (precipitation === 0 && tempMax < 38) {
    instructions.push(
      "Good day for fertilizer application — apply in early morning and water lightly after."
    );
  }

  /* ── Pest & disease ─────────────────────────────────────────────────── */
  if (precipitation > 5 && tempMax > 25 && tempMax < 35) {
    instructions.push(
      "Warm & humid — high risk of fungal disease. Inspect leaves for blight, rust, and mildew."
    );
  } else if (tempMax > 35 && precipitation === 0) {
    instructions.push(
      "Hot & dry — watch for spider mites and aphids on the underside of leaves."
    );
  } else {
    instructions.push(
      "Scout crop rows for early pest signs. Check leaf undersides before 10 AM."
    );
  }

  /* ── Crop-specific tips ─────────────────────────────────────────────── */
  for (const crop of crops.slice(0, 2)) {
    const stage = (crop.stage || "").toLowerCase();
    const name  = crop.name;
    if (stage === "flowering") {
      if (precipitation > 5)
        instructions.push(
          `${name} is in Flowering stage — avoid overhead irrigation; rain may cause flower drop.`
        );
      else
        instructions.push(
          `${name} is in Flowering stage — ensure adequate phosphorus and avoid water stress.`
        );
    } else if (stage === "harvest") {
      instructions.push(
        `${name} is near harvest — monitor grain/fruit moisture and plan transport in advance.`
      );
    }
  }

  /* ── Heat stress ────────────────────────────────────────────────────── */
  if (tempMax > 40) {
    instructions.push(
      "Extreme heat today — provide shade netting for sensitive crops and ensure livestock have water."
    );
  }

  /* ── Market tip (static, context-neutral) ──────────────────────────── */
  instructions.push(
    "Check today's mandi prices before dispatch — modal price trend determines optimal sell timing."
  );

  return instructions.slice(0, 5); // cap at 5 instructions
}

/**
 * Compute risk meter values (0–100) from weather data.
 * @param {object} weather
 * @param {number} basePestAlert  - optional override from user history
 * @returns {{ waterStress: number, pestAlert: number, weatherRisk: number }}
 */
export function getRiskMeters(weather, basePestAlert = 30) {
  const { tempMax = 30, precipitation = 0, weatherRisk = 20 } = weather;

  /* Water stress: high when hot + no rain */
  let waterStress = 20;
  if (tempMax > 40 && precipitation === 0) waterStress = 85;
  else if (tempMax > 35 && precipitation < 1) waterStress = 65;
  else if (tempMax > 30 && precipitation < 2) waterStress = 40;
  else if (precipitation > 8) waterStress = 10; // excess rain → low stress but drainage risk

  /* Pest alert: elevated in warm humid conditions */
  let pestAlert = basePestAlert;
  if (precipitation > 5 && tempMax > 25 && tempMax < 36)  pestAlert = Math.min(pestAlert + 30, 80);
  else if (tempMax > 35 && precipitation === 0)             pestAlert = Math.min(pestAlert + 15, 70);

  return {
    waterStress: Math.round(waterStress),
    pestAlert:   Math.round(pestAlert),
    weatherRisk: Math.round(weatherRisk),
  };
}

/**
 * Derive a greeting from server-local time in IST.
 */
export function getGreeting() {
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();
  if (h < 12) return "Good Morning 🌅";
  if (h < 17) return "Good Afternoon ☀️";
  return "Good Evening 🌙";
}
