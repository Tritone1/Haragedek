import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import pg from "pg";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { passport } from "./auth/passport.js";
import { prisma } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { dealsRouter } from "./routes/deals.js";
import { usersRouter } from "./routes/users.js";
import { restaurantsRouter } from "./routes/restaurants.js";
import { merchantRouter } from "./routes/merchant.js";
import { adminRouter } from "./routes/admin.js";
import { pushRouter } from "./routes/push.js";
import { placesRouter } from "./routes/places.js";
import { errorHandler, notFound } from "./lib/http.js";
import { sendSavedDealExpiryNotifications } from "./lib/push.js";

const app = express();
const PgSession = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const currentDir = dirname(fileURLToPath(import.meta.url));
const webDistDir = resolve(currentDir, "../../web/dist");

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = new Set([
      env.WEB_ORIGIN,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ]);
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "250kb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  name: "haragedek.sid",
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/users", usersRouter);
app.use("/api/restaurants", restaurantsRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/admin", adminRouter);
app.use("/api/push", pushRouter);
app.use("/api/places", placesRouter);

if (env.NODE_ENV === "production" && existsSync(webDistDir)) {
  app.use(express.static(webDistDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(webDistDir, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, env.API_HOST, () => {
  console.log(`Grub Stub API listening on http://${env.API_HOST}:${env.PORT}`);
});

async function expireStaleDeals() {
  await prisma.deal.updateMany({
    where: { isActive: true, endsAt: { lte: new Date() } }, data: { isActive: false, status: "expired" },
  });
  await sendSavedDealExpiryNotifications();
}
void expireStaleDeals().catch(console.error);
const expiryTimer = setInterval(() => void expireStaleDeals().catch(console.error), 15 * 60 * 1000);

async function shutdown() {
  clearInterval(expiryTimer);
  server.close(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
