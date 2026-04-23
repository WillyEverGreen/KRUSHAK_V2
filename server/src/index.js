import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import appRoutes from "./routes/appRoutes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(limiter);

// Support comma-separated origins for cross-origin Render deployments
// Set CLIENT_ORIGIN=https://krushak-client.onrender.com in the Render dashboard
const allowedOrigins = (env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin requests (server-to-server / health checks)
      // and any explicitly whitelisted origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "8mb" }));
// Use combined log format in production for structured access logs
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "krushak-pwa-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api", appRoutes);

app.use(notFound);
app.use(errorHandler);

/* ── Server Startup (Render always-on Web Service) ── */
const PORT = env.PORT || 5000;

app.listen(PORT, async () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server running on port ${PORT} [${env.NODE_ENV}]`);
  if (env.MONGO_URI) {
    try {
      await connectDatabase(env.MONGO_URI);
      // eslint-disable-next-line no-console
      console.log("✅ MongoDB connected");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ MongoDB connection failed:", error.message);
      process.exit(1); // Fail fast — Render will restart the service
    }
  }
});

// Export for testing / future use
export default app;
