import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * SystemConfig Schema
 * Stores global application settings, pricing heuristic copies, and system-wide constants.
 */
const SystemConfigSchema = new Schema(
    {
        // ── Platform Settings ──────────────────────────────────────────────────
        commission: { type: String, default: "0" },     // Platform fee percentage
        maxRadius: { type: String, default: "3.0" },      // Max booking distance
        
        // ── Ride Pricing Configuration ──────────────────────────────────────────
        // Categories: MOTO, EVMOTO, AUTO, EVAUTO, GO, EVGO, PRIME, XL
        pricing: {
            MOTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" }
            },
            EVMOTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" }
            },
            AUTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" }
            },
            EVAUTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" }
            },
            GO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" }
            },
            EVGO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" }
            },
            PRIME: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" }
            },
            XL: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" }
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
