import mongoose from "mongoose";
import TripModel from "../models/Trip.js";
import SystemConfig from "../models/SystemConfig.js";
import DriverProfileModel from "../models/DriverProfile.js";
import PublishedRideModel from "../models/PublishedRide.js";
import { calculateFareDetails } from "../utils/PriceEngine.js";

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
      is_night: new Date().getHours() >= 22 || new Date().getHours() < 6,
      total_requests: Math.max(total_requests, 5),
      available_drivers: Math.max(available_drivers, 5)
  });

  return fareData.final_price || 150;
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
      .populate("passenger", "name email profileImage Mobile_no")
      .populate("publishedRide");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const driverProfile = await DriverProfileModel.findOne({ user: userId });

    const stats = await TripModel.aggregate([
      { $match: { driver: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: { $sum: { $cond: [{ $eq: ["$phase", "completed"] }, 1, 0] } },
          cancelledRides: { $sum: { $cond: [{ $eq: ["$phase", "cancelled"] }, 1, 0] } },
          totalEarnings: { $sum: { $cond: [{ $eq: ["$phase", "completed"] }, "$fare.total", 0] } },
          todayEarnings: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfDay] }, { $eq: ["$phase", "completed"] }] }, "$fare.total", 0] }
          },
          todayRides: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfDay] }, { $eq: ["$phase", "completed"] }] }, 1, 0] }
          },
          weekEarnings: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfWeek] }, { $eq: ["$phase", "completed"] }] }, "$fare.total", 0] }
          },
          weekRides: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfWeek] }, { $eq: ["$phase", "completed"] }] }, 1, 0] }
          },
          monthEarnings: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfMonth] }, { $eq: ["$phase", "completed"] }] }, "$fare.total", 0] }
          },
          monthRides: {
            $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", startOfMonth] }, { $eq: ["$phase", "completed"] }] }, 1, 0] }
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
        $group: {
          _id: "$vehicleTypeRequested",
          total: { $sum: "$fare.total" },
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
          .populate("publishedRide", "vehicleType");

        // Simple aggregation for today's stats to show on the dashboard
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Corrected aggregation with ObjectId casting and added driver profile fetch
        const [statsResult, driverProfile] = await Promise.all([
            TripModel.aggregate([
                { $match: { 
                    driver: new mongoose.Types.ObjectId(userId), 
                    phase: "completed", 
                    createdAt: { $gte: startOfDay } 
                } },
                { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: "$fare.total" } } }
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
