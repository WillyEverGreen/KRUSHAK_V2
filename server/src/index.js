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
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: false }));
app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "krushak-pwa-server" });
});

/* ── Vercel Serverless DB Connection ── */
let isDbConnected = false;
app.use(async (req, res, next) => {
  if (!isDbConnected && env.MONGO_URI) {
    try {
      await connectDatabase(env.MONGO_URI);
      isDbConnected = true;
      // eslint-disable-next-line no-console
      console.log("Database connected (Serverless mode)");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Database connection failed:", error.message);
    }
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api", appRoutes);

app.use(notFound);
app.use(errorHandler);

/* ── Local Development Server ── */
if (process.env.NODE_ENV !== "production" || process.env.RUN_LOCAL) {
  const PORT = env.PORT || 5000;
  app.listen(PORT, async () => {
    // eslint-disable-next-line no-console
    console.log(`Server running locally on port ${PORT}`);
    if (!isDbConnected && env.MONGO_URI) {
      try {
        await connectDatabase(env.MONGO_URI);
        isDbConnected = true;
        // eslint-disable-next-line no-console
        console.log("Database connected locally");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Database connection failed locally:", error.message);
      }
    }
  });
}

/* ── Export for Vercel Serverless ── */
export default app;
