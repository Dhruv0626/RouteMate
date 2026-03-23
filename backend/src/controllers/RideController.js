import RideModel from "../models/RideModel.js";

// ─── Get Passenger History ────────────────────────────────────────────────────
export const GetPassengerHistory = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 20, status = "all" } = req.query;

    const filter = { passenger: id };
    if (status !== "all") filter.status = status;

    const rides = await RideModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("driver", "name email");

    const totalRides = await RideModel.countDocuments({ passenger: id, status: "completed" });
    const totalSpent = await RideModel.aggregate([
      { $match: { passenger: id, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$fare" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        rides,
        stats: {
          totalRides,
          totalSpent: totalSpent[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Driver History ───────────────────────────────────────────────────────
export const GetDriverHistory = async (req, res) => {
  try {
    const { id } = req.user;
    const { limit = 20, status = "all" } = req.query;

    const filter = { driver: id };
    if (status !== "all") filter.status = status;

    const rides = await RideModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("passenger", "name email");

    const stats = await RideModel.aggregate([
      { $match: { driver: id, status: "completed" } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: "$fare" },
          avgRating: { $avg: "$rating.passengerToDriver" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        rides,
        stats: {
          totalRides: stats[0]?.totalRides || 0,
          totalEarnings: stats[0]?.totalEarnings || 0,
          avgRating: stats[0]?.avgRating?.toFixed(1) || "5.0",
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create Demo Ride (For Seeding/Testing) ───────────────────────────────────
export const CreateDemoRide = async (req, res) => {
  try {
    const { passengerId, driverId, fare, status, pickupName, destName } = req.body;

    const newRide = await RideModel.create({
      passenger: passengerId || req.user.id,
      driver: driverId,
      fare: fare || 150,
      status: status || "completed",
      pickup: { name: pickupName || "Central Park" },
      destination: { name: destName || "Times Square" },
      vehicleType: "car",
      paymentMethod: "cash",
      distance: "4.5 km",
      duration: "12 mins",
      rating: {
        passengerToDriver: 4.5,
        driverToPassenger: 5.0,
      },
    });

    res.status(201).json({ success: true, ride: newRide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
