import TripModel from "../models/Trip.js";
import FareConfig from "../models/FareConfig.js";

/**
 * Helper to calculate fare based on distance and vehicle type using FareConfig
 */
const calculateFare = async (distanceKm, vehicleType) => {
  const config = await FareConfig.findOne({ vehicleType: vehicleType });
  if (!config) {
    // Attempt fallback to Sedan or generic default
    const fallback = await FareConfig.findOne({ vehicleType: "Sedan" });
    if (!fallback) return 150; 
    
    const totalFare = (fallback.baseFare + (fallback.perKmRate * distanceKm)) * fallback.surgeMultiplier;
    return Math.round(totalFare);
  }

  const totalFare = (config.baseFare + (config.perKmRate * distanceKm)) * config.surgeMultiplier;
  return Math.round(totalFare);
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
      .populate("driver", "name email profileImage Mobile_no");

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
    console.error("Passenger History Error:", error);
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
      .populate("passenger", "name email profileImage Mobile_no");

    const stats = await TripModel.aggregate([
      { $match: { driver: userId, phase: "completed" } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: "$fare.total" }
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        rides: trips,
        stats: {
          totalRides: stats[0]?.totalRides || 0,
          totalEarnings: stats[0]?.totalEarnings || 0,
          avgRating: "5.0", // To be updated when reviews are integrated
        },
      },
    });
  } catch (error) {
    console.error("Driver History Error:", error);
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

        const fare = await calculateFare(parseFloat(distanceKm), vehicleType);
        res.status(200).json({ success: true, fare });
    } catch (error) {
        console.error("Fare Estimate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Create Demo Ride (For Seeding/Testing) ───────────────────────────────────
export const CreateDemoRide = async (req, res) => {
  try {
    const { passengerId, driverId, totalFare, phase, pickupAddress, destAddress, vehicleType, distanceKm } = req.body;

    const vType = vehicleType || "Sedan";
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
    console.error("Create Demo Ride Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
