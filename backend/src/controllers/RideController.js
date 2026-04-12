import TripModel from "../models/Trip.js";
import SystemConfig from "../models/SystemConfig.js";

/**
 * Helper to calculate fare based on distance and vehicle type using FareConfig
 */
const calculateFare = async (distanceKm, vehicleType) => {
  const sys = await SystemConfig.findOne();
  if (!sys) return 150; // Fallback

  const catKey = vehicleType?.toUpperCase() || "PRIME";
  const pricing = sys.pricing[catKey] || sys.pricing["PRIME"];
  
  if (!pricing) return 150;

  const parse = (val) => parseFloat(String(val || "0").replace(/[^\d.]/g, ""));

  const base = parse(pricing.baseFare);
  const rate = parse(pricing.costPerKm);
  const minFare = parse(pricing.minFare);
  
  const total = Math.round(base + (rate * distanceKm));
  return Math.max(total, minFare);
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
      { $match: { passenger: userId, phase: "completed" } },
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

    const stats = await TripModel.aggregate([
      { $match: { driver: userId, phase: "completed" } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: "$fare.total" },
          todayEarnings: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfDay] }, "$fare.total", 0] }
          },
          todayRides: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfDay] }, 1, 0] }
          },
          weekEarnings: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfWeek] }, "$fare.total", 0] }
          },
          weekRides: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfWeek] }, 1, 0] }
          },
          monthEarnings: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$fare.total", 0] }
          },
          monthRides: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] }
          }
        },
      },
    ]);

    const typeBreakdown = await TripModel.aggregate([
      { $match: { driver: userId, phase: "completed" } },
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
          totalRides: stats[0]?.totalRides || 0,
          totalEarnings: stats[0]?.totalEarnings || 0,
          todayEarnings: stats[0]?.todayEarnings || 0,
          todayRides: stats[0]?.todayRides || 0,
          weekEarnings: stats[0]?.weekEarnings || 0,
          weekRides: stats[0]?.weekRides || 0,
          monthEarnings: stats[0]?.monthEarnings || 0,
          monthRides: stats[0]?.monthRides || 0,
          avgRating: "5.0",
          rideTypeBreakdown: typeBreakdown.map(b => ({
            type: b._id,
            earnings: b.total,
            rides: b.count,
            percentage: stats[0]?.totalEarnings > 0 ? Math.round((b.total / stats[0].totalEarnings) * 100) : 0
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
        const stats = await TripModel.aggregate([
            { $match: { driver: userId, phase: "completed", createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: "$fare.total" } } }
        ]);

        res.status(200).json({
            success: true,
            data: trips,
            stats: {
                activeCount: trips.length,
                todayRides: stats[0]?.count || 0,
                todayEarnings: stats[0]?.earnings || 0
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
        total: finalFare,
        baseFare: finalFare * 0.4,
        distanceFare: finalFare * 0.6
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
