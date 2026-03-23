import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/User.js";
import driverProfileRoutes from "./src/routes/DriverProfile.js";
import adminRoutes from "./src/routes/Admin.js";
import uploadRoutes from "./src/routes/Upload.js";
import notificationRoutes from "./src/routes/Notification.js";
import rideRoutes from "./src/routes/Ride.js";
import { apiLimiter } from "./src/middlewares/RateLimiter.js";

// ─── Load Environment Variables ───────────────────────────────────────────────
dotenv.config();

// ─── Passport Configuration ───────────────────────────────────────────────────
import passport from "./src/config/passport.js";

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// ─── 1. Helmet — Security HTTP Headers ───────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = isProduction
  ? [process.env.FRONTEND_URL || "https://your-production-domain.com"]
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // Removed x-csrf-token
    credentials: true
  })
);

// ─── 3. Cookie Parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── 4. Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── 5. Global Rate Limiting ──────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── 6. Passport & Routes ──────────────────────────────────────────────────────
app.use(passport.initialize());

app.use("/api/users", userRoutes);
app.use("/api/driver-profiles", driverProfileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/rides", rideRoutes);

// ─── 7. Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? "Internal server error" : err.message
  });
});

// ─── 8. Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  console.log(`🔒 Security: Helmet ✓ | CORS ✓ | Rate Limiting ✓ | Pure JWT ✓`);
  console.log(`⚡ Cache: Redis ${process.env.CACHE_ENABLED === "true" ? "✓" : "disabled"}`);
});
