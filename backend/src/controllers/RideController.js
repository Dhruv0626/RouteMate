import mongoose from "mongoose";
import TripModel from "../models/Trip.js";
import SystemConfig from "../models/SystemConfig.js";
import DriverProfileModel from "../models/DriverProfile.js";
import PublishedRideModel from "../models/PublishedRide.js";
import UserModel from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { notifyUser } from "../utils/NotifyUtil.js";
import { getIO } from "../utils/SocketManager.js";
import { calculateFareDetails } from "../utils/PriceEngine.js";
import cacheService from "../utils/redis.js";

/**
 * Helper to calculate fare based on distance and vehicle type using RouteMAte Price Engine
 */
const calculateFare = async (distanceKm, vehicleType) => {
  const sys = await SystemConfig.findOne();
  if (!sys) return 150; // Fallback

  const catKey = vehicleType?.toUpperCase() || "PRIME";
  const pricing = sys.pricing[catKey] || sys.pricing["PRIME"];

  if (!pricing) return 150;

  const parse = (val) => parseFloat(String(val || "0").replace(/[^\d.]/g, ""));

  // Supply = Total Drivers Online
  const available_drivers = await DriverProfileModel.countDocuments({ isOnline: true, isApproved: true });

  // Demand = Total "pending" or "booked" rides in the last 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const total_requests = await PublishedRideModel.countDocuments({
    createdAt: { $gte: fifteenMinsAgo }
  });

  const is_ev = ["EVMOTO", "EVAUTO", "EVGO"].includes(catKey);

  const fareData = calculateFareDetails({
    category: vehicleType.toLowerCase(),
    is_ev,
    base_fare: parse(pricing.baseFare),
    per_km_rate: parse(pricing.costPerKm),
    per_min_rate: parse(pricing.perMinRate || 0.5),
    night_charge: parse(pricing.nightCharge),
    min_fare: parse(pricing.minFare),
    surge_cap: parse(pricing.surgeCap || (is_ev ? 1.5 : 1.8)),
    distance_km: distanceKm,
    time_min: distanceKm * 2, // Estimate 2 mins per km
    is_night: (() => {
        const istHour = new Date(Date.now() + (5.5 * 60 * 60 * 1000)).getUTCHours();
        return istHour >= 22 || istHour < 6;
    })(),
    total_requests: Math.max(total_requests, 5),
    available_drivers: Math.max(available_drivers, 5)
  });

  return fareData.final_price || 150;
};

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

// ─── Get Passenger History ────────────────────────────────────────────────────
export const GetPassengerHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, phase = "all" } = req.query;

    const filter = { passenger: userId };
    if (phase !== "all") filter.phase = phase;

    const trips = await TripModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("driver", "name email profileImage Mobile_no")
      .populate("publishedRide");

    const totalTrips = await TripModel.countDocuments({ passenger: userId, phase: "completed" });

    // Calculate total spent using the nested fare.total field
    const stats = await TripModel.aggregate([
      { $match: { passenger: new mongoose.Types.ObjectId(userId), phase: "completed" } },
      { $group: { _id: null, totalSpent: { $sum: "$fare.total" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        rides: trips, // naming kept as 'rides' for frontend compatibility if needed
        stats: {
          totalRides: totalTrips,
          totalSpent: stats[0]?.totalSpent || 0,
        },
      },
    });
  } catch (error) {
    console.error("Passenger History Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Driver History ───────────────────────────────────────────────────────
export const GetDriverHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, phase = "all" } = req.query;

    const filter = { driver: userId };
    if (phase !== "all") filter.phase = phase;

    const trips = await TripModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("passenger", "name email profileImage Mobile_no passengerStats")
      .populate("publishedRide");

    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const startOfDay = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - nowIST.getUTCDay());
    
    const startOfMonth = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1, 0, 0, 0) - (5.5 * 60 * 60 * 1000));

    const driverProfile = await DriverProfileModel.findOne({ user: userId });

    const stats = await TripModel.aggregate([
      { $match: { driver: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "payments",
          localField: "payment",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: { $sum: { $cond: [{ $eq: ["$phase", "completed"] }, 1, 0] } },
          cancelledRides: { $sum: { $cond: [{ $eq: ["$phase", "cancelled"] }, 1, 0] } },
          totalEarnings: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] },
                0
              ]
            }
          },
          todayEarnings: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfDay] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] },
                0
              ]
            }
          },
          todayRides: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfDay] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                1,
                0
              ]
            }
          },
          weekEarnings: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfWeek] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] },
                0
              ]
            }
          },
          weekRides: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfWeek] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                1,
                0
              ]
            }
          },
          monthEarnings: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfMonth] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] },
                0
              ]
            }
          },
          monthRides: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$createdAt", startOfMonth] },
                  { $eq: ["$phase", "completed"] },
                  { $eq: [{ $arrayElemAt: ["$paymentDetails.status", 0] }, "completed"] }
                ]},
                1,
                0
              ]
            }
          }
        },
      },
    ]);

    const s = stats[0] || {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalEarnings: 0,
      todayEarnings: 0,
      todayRides: 0,
      weekEarnings: 0,
      weekRides: 0,
      monthEarnings: 0,
      monthRides: 0
    };

    const typeBreakdown = await TripModel.aggregate([
      { $match: { driver: new mongoose.Types.ObjectId(userId), phase: "completed" } },
      {
        $lookup: {
          from: "payments",
          localField: "payment",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      {
        $match: { "paymentDetails.status": "completed" }
      },
      {
        $group: {
          _id: "$vehicleTypeRequested",
          total: { $sum: { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] } },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        rides: trips,
        stats: {
          totalRides: s.totalRides,
          completedRides: s.completedRides,
          cancelledRides: s.cancelledRides,
          totalEarnings: s.totalEarnings,
          todayEarnings: s.todayEarnings,
          todayRides: s.todayRides,
          weekEarnings: s.weekEarnings,
          weekRides: s.weekRides,
          monthEarnings: s.monthEarnings,
          monthRides: s.monthRides,
          avgRating: driverProfile?.averageRating || 0,
          acceptanceRate: s.totalRides > 0 ? Math.round(((s.totalRides - s.cancelledRides) / s.totalRides) * 100) : 100,
          cancellationRate: s.totalRides > 0 ? Math.round((s.cancelledRides / s.totalRides) * 100) : 0,
          rideTypeBreakdown: typeBreakdown.map(b => ({
            type: b._id,
            earnings: b.total,
            rides: b.count,
            percentage: s.totalEarnings > 0 ? Math.round((b.total / s.totalEarnings) * 100) : 0
          }))
        },
      },
    });
  } catch (error) {
    console.error("Driver History Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Active Trips (Ongoing mission) ───────────────────────────────────────
export const GetActiveTrips = async (req, res) => {
  try {
    const userId = req.user.id;
    const trips = await TripModel.find({
      driver: userId,
      phase: { $in: ["matched", "arrived", "ongoing"] }
    }).populate("passenger", "name profileImage Mobile_no passengerStats")
      .populate("publishedRide", "vehicleType departureTime lateZone lateReason lateMinutes");

    // Simple aggregation for today's stats to show on the dashboard
    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const startOfDay = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    // Corrected aggregation with ObjectId casting and added driver profile fetch
    const [statsResult, driverProfile] = await Promise.all([
      TripModel.aggregate([
        { $match: { 
            driver: new mongoose.Types.ObjectId(userId), 
            phase: "completed", 
            createdAt: { $gte: startOfDay } 
        } },
        {
          $lookup: {
            from: "payments",
            localField: "payment",
            foreignField: "_id",
            as: "paymentDetails"
          }
        },
        {
          $match: { "paymentDetails.status": "completed" }
        },
        { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: { $arrayElemAt: ["$paymentDetails.driverEarnings", 0] } } } }
      ]),
      DriverProfileModel.findOne({ user: userId })
    ]);

    res.status(200).json({
      success: true,
      data: trips,
      stats: {
        activeCount: trips.length,
        todayRides: statsResult[0]?.count || 0,
        todayEarnings: statsResult[0]?.earnings || 0,
        averageRating: driverProfile?.averageRating || 0,
        onlineHours: 0 // Placeholder/computed logic can be added later
      }
    });
  } catch (error) {
    console.error("Get Active Trips Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Fare Estimate based on distance and vehicle type
 */
export const GetFareEstimate = async (req, res) => {
  try {
    const { distanceKm, vehicleType } = req.query;
    if (!distanceKm || !vehicleType) {
      return res.status(400).json({ success: false, message: "Missing required parameters (distanceKm, vehicleType)" });
    }

    const fare = await calculateFare(parseFloat(distanceKm), vehicleType || "PRIME");
    res.status(200).json({ success: true, fare });
  } catch (error) {
    console.error("Fare Estimate Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create Demo Ride (For Seeding/Testing) ───────────────────────────────────
export const CreateDemoRide = async (req, res) => {
  try {
    const { passengerId, driverId, totalFare, phase, pickupAddress, destAddress, vehicleType, distanceKm } = req.body;

    const vType = vehicleType || "PRIME";
    const dist = parseFloat(distanceKm) || 5;

    // Calculate fare dynamically if not provided
    const finalFare = totalFare || await calculateFare(dist, vType);

    const newTrip = await TripModel.create({
      passenger: passengerId || req.user.id,
      driver: driverId,
      phase: phase || "completed",
      source: {
        address: pickupAddress || "Central Park",
        location: { type: "Point", coordinates: [77.5946, 12.9716] } // Default coords
      },
      destination: {
        address: destAddress || "Times Square",
        location: { type: "Point", coordinates: [77.6101, 12.9304] }
      },
      vehicleTypeRequested: vType,
      fare: {
        total: Math.round(finalFare),
        baseFare: Math.round(finalFare * 0.4),
        distanceFare: Math.round(finalFare * 0.6),
        nightFare: 0
      },
      paymentMethod: "cash",
      paymentStatus: "paid",
      distanceActual: dist,
      durationActual: 15,
      completedAt: new Date()
    });

    res.status(201).json({ success: true, ride: newTrip });
  } catch (error) {
    console.error("Create Demo Ride Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Passenger Cancels a Matched/Arrived Ride
 */
export const CancelRideByPassenger = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tripId, reason } = req.body;
    const passengerId = req.user.id;

    const trip = await TripModel.findById(tripId).session(session);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.passenger.toString() !== passengerId) {
      return res.status(403).json({ success: false, message: "Unauthorized to cancel this trip" });
    }

    if (!["matched", "arrived"].includes(trip.phase)) {
      return res.status(400).json({ success: false, message: `Cannot cancel trip in ${trip.phase} phase` });
    }

    let penalty = 0;
    const now = new Date();

    if (trip.phase === "matched") {
      const matchedAt = trip.matchedAt || trip.createdAt;
      const diffMin = (now - new Date(matchedAt)) / (1000 * 60);

      if (diffMin > 3) {
        // Calculate driver distance to pickup
        const driverProfile = await DriverProfileModel.findOne({ user: trip.driver }).session(session);
        const driverLoc = driverProfile?.currentLocation?.coordinates; // [lng, lat]
        const pickupLoc = trip.source.location.coordinates;

        if (driverLoc && pickupLoc) {
          const distKm = haversineKm(driverLoc[1], driverLoc[0], pickupLoc[1], pickupLoc[0]);
          penalty = distKm >= 0.5 ? 30 : 50;
        } else {
          penalty = 30; // Fallback
        }
      }
    } else if (trip.phase === "arrived") {
      const arrivedAt = trip.driverArrivedAt;
      const diffMin = arrivedAt ? (now - new Date(arrivedAt)) / (1000 * 60) : 2; // Assume >1 if timestamp missing

      penalty = diffMin < 1 ? 30 : 50;
    }

    // 1. Update Trip
    trip.phase = "cancelled";
    trip.cancelledBy = "passenger";
    trip.cancelledAt = now;
    trip.cancellationReason = "Passenger Cancelled";
    trip.cancellationFee = penalty;
    
    const driverComp = penalty === 50 ? 35 : (penalty === 30 ? 20 : 0);
    trip.driverCompensation = driverComp;
    if (driverComp > 0) trip.driverCompensationPaidAt = now;

    await trip.save({ session });

    // 2. Update Passenger Account (Auto-deduct from wallet if balance is sufficient)
    let penaltyDeductedFromWallet = false;
    let passengerNewWalletBalance = 0;
    let passengerNewDueBalance = 0;
    let passengerNewAccountStatus = "active";

    if (penalty > 0) {
      const passenger = await UserModel.findById(passengerId).session(session);
      if (!passenger) throw new Error("Passenger not found");

      if ((passenger.walletBalance || 0) >= penalty) {
        // Direct cut from wallet balance
        passenger.walletBalance = (passenger.walletBalance || 0) - penalty;
        passenger.dueBalance = 0;
        passenger.accountStatus = "active";
        await passenger.save({ session });

        penaltyDeductedFromWallet = true;
        passengerNewWalletBalance = passenger.walletBalance;
        passengerNewDueBalance = passenger.dueBalance;
        passengerNewAccountStatus = passenger.accountStatus;

        // Record Debit WalletTransaction for Passenger
        await WalletTransaction.create([{
          user: passengerId,
          type: "debit",
          amount: penalty,
          balanceAfter: passenger.walletBalance,
          affectsBalance: true,
          reference: "penalty_payment",
          description: `Auto-deducted cancellation penalty of ₹${penalty} from wallet`
        }], { session });

        // Credit SuperAdmin (Platform)
        const superAdmin = await UserModel.findOne({ role: "superadmin" }).session(session);
        if (superAdmin) {
          superAdmin.walletBalance = (superAdmin.walletBalance || 0) + penalty;
          await superAdmin.save({ session });

          await WalletTransaction.create([{
            user: superAdmin._id,
            type: "credit",
            amount: penalty,
            balanceAfter: superAdmin.walletBalance,
            affectsBalance: true,
            reference: "penalty_payment",
            description: `Credit: Received cancellation penalty of ₹${penalty} from passenger ${passenger.name}`
          }], { session });
        }
      } else {
        // Insufficient balance, set due balance & restrict account
        passenger.dueBalance = (passenger.dueBalance || 0) + penalty;
        passenger.accountStatus = "payment_due";
        await passenger.save({ session });

        passengerNewWalletBalance = passenger.walletBalance;
        passengerNewDueBalance = passenger.dueBalance;
        passengerNewAccountStatus = passenger.accountStatus;
      }
    }

    // 3. Compensate Driver (Platform pays driver immediately)
    if (driverComp > 0) {
      const superAdmin = await UserModel.findOne({ role: "superadmin" }).session(session);
      if (superAdmin) {
        // Platform Debit
        superAdmin.walletBalance = (superAdmin.walletBalance || 0) - driverComp;
        await superAdmin.save({ session });

        await WalletTransaction.create([{
          user: superAdmin._id,
          type: "debit",
          amount: driverComp,
          balanceAfter: superAdmin.walletBalance,
          affectsBalance: true,
          reference: "penalty_compensation",
          referenceId: trip._id,
          description: `Debit: Driver compensation for passenger cancellation (Trip: ${trip._id})`
        }], { session });

        // Driver Credit
        const driver = await UserModel.findById(trip.driver).session(session);
        if (driver) {
          driver.walletBalance = (driver.walletBalance || 0) + driverComp;
          await driver.save({ session });

          await WalletTransaction.create([{
            user: trip.driver,
            type: "credit",
            amount: driverComp,
            balanceAfter: driver.walletBalance,
            affectsBalance: true,
            reference: "penalty_compensation",
            referenceId: trip._id,
            description: `Credit: Cancellation compensation from passenger (Trip: ${trip._id})`
          }], { session });
        }
      }
    }

    // 4. Update Published Ride bookings
    await PublishedRideModel.updateOne(
      { 
        _id: new mongoose.Types.ObjectId(trip.publishedRide), 
        "bookings.passenger": new mongoose.Types.ObjectId(passengerId) 
      },
      { 
        $set: { 
          "bookings.$.status": "cancelled", 
          "bookings.$.rejectedAt": now,
          status: "open"
        } 
      },
      { session }
    );

    await session.commitTransaction();

    // Invalidate Redis profile cache
    await cacheService.del(`user:profile:${passengerId}`);

    // 5. Notifications & Sockets
    const io = getIO();
    if (io) {
      io.to(trip.driver.toString()).emit("ride_cancelled", { tripId: trip._id, penalty: driverComp });
      io.to(trip.passenger.toString()).emit("ride_cancelled", { tripId: trip._id, penalty });
      io.to(trip._id.toString()).emit("ride_status_update", { status: "cancelled", tripId: trip._id });
    }

    await notifyUser({
      userId: trip.driver,
      title: "Trip Cancelled 🚫",
      message: driverComp > 0 
        ? `Passenger cancelled the trip. ₹${driverComp} has been credited to your wallet as compensation.`
        : `Passenger cancelled the trip.`,
      type: "info"
    });

    if (penalty > 0) {
      if (penaltyDeductedFromWallet) {
        await notifyUser({
          userId: passengerId,
          title: "Cancellation Penalty Paid ✅",
          message: `A cancellation fee of ₹${penalty} has been auto-deducted from your wallet. Your rides continue unrestricted.`,
          type: "success"
        });
      } else {
        await notifyUser({
          userId: passengerId,
          title: "Cancellation Penalty ⚠️",
          message: `You have been charged a ₹${penalty} cancellation fee. Your wallet balance was insufficient. Please pay manually to resume booking.`,
          type: "error"
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Trip cancelled", 
      penalty,
      penaltyDeductedFromWallet,
      newDueBalance: passengerNewDueBalance,
      newWalletBalance: passengerNewWalletBalance,
      accountStatus: passengerNewAccountStatus
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("CancelRideByPassenger Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Pay Pending Penalty
 */
export const PayPenalty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.id;
    const { amount } = req.body || {}; // In a real app, this might come from a payment gateway callback

    const user = await UserModel.findById(userId).session(session);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.dueBalance <= 0) {
      return res.status(400).json({ success: false, message: "No pending balance due" });
    }

    const payAmount = amount || user.dueBalance;

    // Record Transaction
    await WalletTransaction.create([{
      user: userId,
      type: "debit",
      amount: payAmount,
      balanceAfter: user.walletBalance,
      affectsBalance: false,
      reference: "penalty_payment",
      description: `Payment: Cleared pending cancellation penalty of ₹${payAmount}`
    }], { session });

    // Update User
    user.dueBalance = Math.max(0, user.dueBalance - payAmount);
    if (user.dueBalance === 0) {
      user.accountStatus = "active";
    }
    await user.save({ session });

    // Credit Platform (SuperAdmin)
    const superAdmin = await UserModel.findOne({ role: "superadmin" }).session(session);
    if (superAdmin) {
      superAdmin.walletBalance = (superAdmin.walletBalance || 0) + payAmount;
      await superAdmin.save({ session });

      await WalletTransaction.create([{
        user: superAdmin._id,
        type: "credit",
        amount: payAmount,
        balanceAfter: superAdmin.walletBalance,
        affectsBalance: true,
        reference: "penalty_payment",
        description: `Credit: Received penalty payment from user ${user.name}`
      }], { session });
    }

    await session.commitTransaction();

    // Invalidate Redis profile cache
    await cacheService.del(`user:profile:${req.user.id}`);

    res.status(200).json({ 
      success: true, 
      message: "Penalty paid successfully", 
      newDueBalance: user.dueBalance,
      accountStatus: user.accountStatus 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("PayPenalty Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
