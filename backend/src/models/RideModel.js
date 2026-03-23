import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // For pending rides
    },
    pickup: {
      name: String,
      latitude: Number,
      longitude: Number,
    },
    destination: {
      name: String,
      latitude: Number,
      longitude: Number,
    },
    distance: {
        type: String, // e.g. "5.2 km"
    },
    duration: {
        type: String, // e.g. "15 mins"
    },
    fare: {
      type: Number,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car", "sedan", "suv"],
      default: "car",
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "completed",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "wallet", "card"],
      default: "cash",
    },
    rating: {
      passengerToDriver: { type: Number, default: 0 },
      driverToPassenger: { type: Number, default: 0 },
    },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Ride", rideSchema);
