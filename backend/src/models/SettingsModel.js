import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // Specific Pricing for different vehicle categories (stored as strings with symbols)
    pricing: {
      bike: {
        baseFare: { type: String, default: "₹25" },
        costPerKm: { type: String, default: "₹8" }
      },
      auto: {
        baseFare: { type: String, default: "₹35" },
        costPerKm: { type: String, default: "₹10" }
      },
      sedan: {
        baseFare: { type: String, default: "₹50" },
        costPerKm: { type: String, default: "₹15" }
      },
      suv: {
        baseFare: { type: String, default: "₹80" },
        costPerKm: { type: String, default: "₹20" }
      }
    },
    surgeMultiplier: { type: String, default: "1.2x" },
    commission: { type: String, default: "15%" },
    appName: { type: String, default: "RouteMate" },
    supportEmail: { type: String, default: "support@routemate.com" },
    maintenanceMode: { type: Boolean, default: false },
    autoApproveDrivers: { type: Boolean, default: false },
    enableCrypto: { type: Boolean, default: true },
    realTimeTracking: { type: Boolean, default: true },
    maxRadius: { type: String, default: "25km" },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
