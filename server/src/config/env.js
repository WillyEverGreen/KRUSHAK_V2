import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server-local env first, then fall back to repository root env.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: false,
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  MANDI_API_KEY:   z.string().optional().default(""),
  GNEWS_API_KEY:   z.string().optional().default(""),
  GNEWS_COUNTRY:   z.string().optional().default("in"),
  NEWSDATA_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  /* Provider hints — all optional, safe defaults */
  WEATHER_PROVIDER: z.string().optional().default("open-meteo"),
  MARKET_PROVIDER:  z.string().optional().default("data.gov.in"),
  NEWS_PROVIDER:    z.string().optional().default("gnews+newsdata"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${formatted}`);
}

export const env = parsed.data;
