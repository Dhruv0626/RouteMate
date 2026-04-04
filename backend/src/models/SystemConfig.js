import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * SystemConfig Schema
 * Stores global application settings, pricing heuristic copies, and system-wide constants.
 */
const SystemConfigSchema = new Schema(
    {
        // ── Platform Settings ──────────────────────────────────────────────────
        commission: { type: String, default: "" },     // Platform fee percentage
        maxRadius: { type: String, default: "" },    // Max booking distance
        surgeMultiplier: { type: String, default: "" },    // Global surge heuristic

        // ── Pricing Metadata (Copy of FareConfig for fast frontend lookup) ──────
        pricing: {
            Sedan: {
                baseFare: { type: String, default: "" },
                costPerKm: { type: String, default: "" }
            },
            SUV: {
                baseFare: { type: String, default: "" },
                costPerKm: { type: String, default: "" }
            },
            Hatchback: {
                baseFare: { type: String, default: "" },
                costPerKm: { type: String, default: "" }
            },
            Auto: {
                baseFare: { type: String, default: "" },
                costPerKm: { type: String, default: "" }
            },
            Bike: {
                baseFare: { type: String, default: "" },
                costPerKm: { type: String, default: "" }
            }
        },

        // ── Contact & Support ──────────────────────────────────────────────────
        supportEmail: { type: String, default: "support@routemate.com" },
        contactNumber: { type: String, default: "" },
        googleMapsKey: { type: String, default: "" },

        // ── Social & Links ──────────────────────────────────────────────────────
        socialLinks: {
            facebook: { type: String, default: "" },
            twitter: { type: String, default: "" },
            instagram: { type: String, default: "" },
            linkedin: { type: String, default: "" }
        }
    },
    { timestamps: true }
);

export default mongoose.model("SystemConfig", SystemConfigSchema);
