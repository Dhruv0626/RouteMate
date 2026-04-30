import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

// Initialize environment variables immediately before other imports
dotenv.config({ quiet: true });

import helmet from "helmet";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/User.js";
import driverProfileRoutes from "./src/routes/DriverProfile.js";
import adminRoutes from "./src/routes/Admin.js";
import uploadRoutes from "./src/routes/Upload.js";
import notificationRoutes from "./src/routes/Notification.js";
import rideRoutes from "./src/routes/Ride.js";
import publishedRideRoutes from "./src/routes/PublishedRide.js";
import savedPlaceRoutes from "./src/routes/SavedPlace.js";
import sosRoutes from "./src/routes/SOS.js";
import paymentRoutes from "./src/routes/Payment.js";
import { apiLimiter } from "./src/middlewares/RateLimiter.js";
import { initSocket } from "./src/utils/SocketManager.js";
import { initTripMonitorCron } from "./src/utils/TripMonitorCron.js";
import { razorpayWebhook } from "./src/controllers/PaymentController.js";
import TripModel from "./src/models/Trip.js";

// ─── Passport Configuration ───────────────────────────────────────────────────
import passport from "./src/config/passport.js";

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// ─── Health Check / Keep-Alive Endpoint ──────────────────────────────────────
app.get("/ping", (req, res) => res.status(200).send("pong"));

// Enable trust proxy for Render (behind a load balancer)
if (isProduction) {
  app.set("trust proxy", 1);
}

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
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

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
// Razorpay webhook must be BEFORE express.json() to get the raw body as Buffer for signature verification
app.post("/api/webhook/razorpay", express.raw({ type: "application/json" }), razorpayWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/api/published-rides", publishedRideRoutes);
app.use("/api/saved-places", savedPlaceRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/payments", paymentRoutes);

// ─── 7. Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "An unexpected system error occurred.";

  console.error(`[${new Date().toISOString()}] ❌ ${status} - ${message}`);

  res.status(status).json({
    success: false,
    message: isProduction ? "RouteMate encountered a temporary server issue. Please try again later." : message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// ─── 8. Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Initialize the global SocketManager with this instance
initSocket(io);

// Socket.io namespaces or rooms logic
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_ride", (rideId) => {
    socket.join(rideId);
    console.log(`Socket ${socket.id} joined ride ${rideId}`);
  });

  socket.on("join_admin", (userId) => {
    socket.join("admins");
    console.log(`Socket ${socket.id} (Admin ${userId}) joined admins room`);
  });

  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined user room ${userId}`);
    }
  });

  socket.on("driver_location_update", async (data) => {
    // 1. Broadcast driver location to all passengers in the ride room
    socket.to(data.rideId).emit("location_update", data);

    // 2. Update trip distance tracking for auto-SOS route-deviation detection
    if (data.rideId && data.lat && data.lng) {
      try {
        const trip = await TripModel.findById(data.rideId)
          .select("destination lastDistanceToDestination consecutiveNoProgress stoppedAt phase");

        if (!trip || trip.phase !== "ongoing") return;

        const destCoords = trip.destination?.location?.coordinates;
        if (!destCoords || destCoords.length < 2) return;

        const [destLng, destLat] = destCoords;
        const R = 6371;
        const dLat = ((destLat - data.lat) * Math.PI) / 180;
        const dLon = ((destLng - data.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((data.lat * Math.PI) / 180) *
          Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        const currentDistKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const prevDist = trip.lastDistanceToDestination;
        const isMovingAway = prevDist !== undefined && prevDist !== null && currentDistKm > prevDist + 0.1;
        const isStopped = data.speed !== undefined && data.speed < 3;

        const updates = { lastDistanceToDestination: currentDistKm };

        // Track consecutive wrong-direction checks
        if (isMovingAway) {
          updates.consecutiveNoProgress = (trip.consecutiveNoProgress || 0) + 1;
        } else {
          updates.consecutiveNoProgress = 0; // reset on progress
        }

        // Track stop time for auto_timeout detection
        if (isStopped && !trip.stoppedAt) {
          updates.stoppedAt = new Date();
        } else if (!isStopped) {
          updates.stoppedAt = null; // driver moving again — reset
        }

        await TripModel.findByIdAndUpdate(data.rideId, updates);
      } catch (err) {
        console.error("[Socket] Location tracking error:", err.message);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", async () => {
  // ⏱️  Start trip safety monitor cron (every 2 min)
  initTripMonitorCron();

  // 🚀 KEEP-ALIVE: Ping the server every 10 minutes to prevent Render sleep mode
  const BACKEND_URL = process.env.BACKEND_URL;
  if (BACKEND_URL && BACKEND_URL.includes("onrender.com")) {
    const https = await import("https");
    setInterval(() => {
      https.get(`${BACKEND_URL}/ping`, (res) => {
        // Silent on success
      }).on("error", (err) => console.error("💔 Keep-Alive Error:", err.message));
    }, 10 * 60 * 1000); // 10 minutes
  }
});
