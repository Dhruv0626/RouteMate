import cron from "node-cron";
import mongoose from "mongoose";
import TripModel from "../models/Trip.js";
import SOSModel from "../models/SOS.js";
import { notifyUser } from "./NotifyUtil.js";
import { triggerSOS } from "../controllers/SOSController.js";
import { getIO } from "./SocketManager.js";

// ─── Haversine Distance (km) ─────────────────────────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Send "Are you safe?" warning notification ───────────────────────────────
const sendSafetyWarning = async (trip, reason) => {
  const io = getIO();

  // In-app notification
  await notifyUser({
    userId:  trip.passenger._id,
    title:   "🚨 Are you okay?",
    message: `${reason} Tap 'Yes, I'm safe' to dismiss, or we'll alert your contacts in 3 minutes.`,
    type:    "warning",
    link:    null,
    metadata: { type: "sos_warning", tripId: trip._id },
  });

  // Real-time socket event to passenger's client (for in-app modal)
  if (io) {
    io.to(trip._id.toString()).emit("sos_warning", {
      tripId: trip._id.toString(),
      reason,
    });
  }

  console.log(`⚠️ SOS warning sent — Trip: ${trip._id} | Reason: ${reason}`);
};

// ─── Process Stopped Driver (Trigger 3 — auto_timeout) ──────────────────────
const checkStoppedDriver = async (trip) => {
  const now = Date.now();
  const STOP_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
  const CONFIRM_WINDOW_MS = 3 * 60 * 1000; // 3 minutes after warning
  const confirmedSafe = trip.passengerConfirmedSafe;

  if (!trip.stoppedAt) return; // driver is moving

  const stoppedMs = now - new Date(trip.stoppedAt).getTime();

  if (stoppedMs >= STOP_LIMIT_MS) {
    // Check if we already sent a warning
    if (trip.sosWarningSentAt) {
      const warnedMs = now - new Date(trip.sosWarningSentAt).getTime();
      if (warnedMs >= CONFIRM_WINDOW_MS && !confirmedSafe) {
        // Passenger didn't confirm safe within 3 min → trigger SOS
        console.log(`🆘 Auto-SOS: driver stopped 15+ min — Trip: ${trip._id}`);
        await triggerSOS({ tripId: trip._id, triggerMethod: "auto_timeout" });
      }
    } else {
      // First time hitting the threshold — send warning
      await TripModel.findByIdAndUpdate(trip._id, {
        sosWarningSentAt:    new Date(),
        passengerConfirmedSafe: false,
      });
      await sendSafetyWarning(trip, "The driver appears to have stopped for over 15 minutes.");
    }
  }
};

// ─── Process Route Deviation (Trigger 4 — route_deviation) ─────────────────
const checkRouteDeviation = async (trip) => {
  const now = Date.now();
  const CONFIRM_WINDOW_MS = 3 * 60 * 1000; // 3 minutes after warning

  const destCoords = trip.destination?.location?.coordinates;
  if (!destCoords || destCoords.length < 2) return; // No destination to check

  // We need the driver's current location (stored via location update events)
  if (trip.lastDistanceToDestination === null || trip.lastDistanceToDestination === undefined) return;

  if (trip.consecutiveNoProgress >= 3) {
    if (trip.sosWarningSentAt) {
      const warnedMs = now - new Date(trip.sosWarningSentAt).getTime();
      if (warnedMs >= CONFIRM_WINDOW_MS && !trip.passengerConfirmedSafe) {
        // Auto-SOS
        console.log(`🆘 Auto-SOS: route deviation 6+ min — Trip: ${trip._id}`);
        await triggerSOS({ tripId: trip._id, triggerMethod: "route_deviation" });
      }
    } else {
      await TripModel.findByIdAndUpdate(trip._id, {
        sosWarningSentAt:    new Date(),
        passengerConfirmedSafe: false,
      });
      await sendSafetyWarning(trip, "The driver appears to be moving away from your destination.");
    }
  }
};

// ─── Main Cron Runner ─────────────────────────────────────────────────────────
const runTripMonitor = async () => {
  try {
    // Fetch all ongoing trips (with SOS fields + destination coords)
    const ongoingTrips = await TripModel.find({ phase: "ongoing" })
      .populate("passenger", "_id name")
      .select(
        "_id passenger driver destination stoppedAt sosWarningSentAt " +
        "passengerConfirmedSafe lastDistanceToDestination consecutiveNoProgress"
      );

    if (ongoingTrips.length === 0) return;

    for (const trip of ongoingTrips) {
      // Skip if an active SOS already exists
      const activeSOS = await SOSModel.findOne({ trip: trip._id, status: "active" });
      if (activeSOS) continue;

      // Skip if passenger already confirmed safe this cycle
      if (trip.passengerConfirmedSafe) continue;

      // Run both checks
      await checkStoppedDriver(trip);
      await checkRouteDeviation(trip);
    }
  } catch (err) {
    console.error("[TripMonitorCron] Error:", err.message);
  }
};

// ─── Referral Bonus Expiry Job (Runs daily at midnight) ─────────────────────
const expireReferralBonuses = async () => {
  try {
    const WalletTransaction = mongoose.model("WalletTransaction");
    const User = mongoose.model("User");
    
    // Find all referral credits that have expired and haven't been marked as processed
    const now = new Date();
    const expiredTxs = await WalletTransaction.find({
      reference: "referral",
      type: "credit",
      expiresAt: { $lte: now },
      isExpired: false
    });

    if (expiredTxs.length === 0) return;

    console.log(`[ReferralExpiryCron] Processing ${expiredTxs.length} expired bonuses...`);

    for (const tx of expiredTxs) {
      const user = await User.findById(tx.user);
      if (!user) continue;

      // Debit the amount (capped at current balance)
      const debitAmount = Math.min(tx.amount, user.walletBalance);
      
      if (debitAmount > 0) {
        await WalletTransaction.createTransaction({
          user: user._id,
          type: "debit",
          amount: debitAmount,
          reference: "promo",
          description: `Deduction: Referral bonus (₹${tx.amount}) expired.`
        });
      }

      // Mark original tx as expired so we don't process it again
      tx.isExpired = true;
      await tx.save();

      // Notify user
      await notifyUser({
        userId: user._id,
        title: "Bonus Expired ⏰",
        message: `Your referral bonus of ₹${tx.amount} has expired and been removed from your wallet.`,
        type: "info"
      });
    }
  } catch (err) {
    console.error("[ReferralExpiryCron] Error:", err.message);
  }
};

// ─── Export: Initialize Cron ─────────────────────────────────────────────────
/**
 * Runs every 2 minutes — checks all ongoing trips for SOS conditions.
 * Also runs daily at midnight to expire referral bonuses.
 */
export const initTripMonitorCron = () => {
  cron.schedule("*/2 * * * *", runTripMonitor);
  
  // Daily at midnight
  cron.schedule("0 0 * * *", expireReferralBonuses);
};
