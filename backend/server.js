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
import { apiLimiter } from "./src/middlewares/RateLimiter.js";
import { initSocket } from "./src/utils/SocketManager.js";

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

  socket.on("driver_location_update", (data) => {
    // broadcast driver location to all passengers in the ride room
    socket.to(data.rideId).emit("location_update", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", async () => {
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
