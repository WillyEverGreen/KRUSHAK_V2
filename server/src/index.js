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

app.use("/api/auth", authRoutes);
app.use("/api", appRoutes);

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${env.PORT}`);
  });

  try {
    await connectDatabase(env.MONGO_URI);
    // eslint-disable-next-line no-console
    console.log("Database connected");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "Database connection failed. Running API in degraded mode without MongoDB.",
      error.message,
    );
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Server failed to start:", error);
  process.exit(1);
});
