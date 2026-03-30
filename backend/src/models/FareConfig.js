import mongoose from "mongoose";
const { Schema } = mongoose;

const FareConfigSchema = new Schema(
  {
    vehicleType: {
      type: String,
      enum: ["Sedan", "SUV", "Hatchback", "Auto", "Bike"],
      unique: true,
    },
    baseFare:            { type: Number, required: true },     // flat base charge (₹)
    perKmRate:           { type: Number, required: true },     // ₹ per km
    perMinuteRate:       { type: Number, required: true },     // ₹ per minute
    minimumFare:         { type: Number, required: true },     // minimum billable fare
    surgePricingEnabled: { type: Boolean, default: false },
    peakHourMultiplier:  { type: Number, default: 1.5 },
    isActive:            { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("FareConfig", FareConfigSchema);
