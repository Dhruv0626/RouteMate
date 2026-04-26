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
        taxPercentage: { type: Number, default: 5 },    // Global flat tax rate
        maxRadius: { type: String, default: "3.0" },      // Max booking distance
        surgeMultiplier: { type: String, default: "1.2x" }, // Hard multiplier for high demand
        realTimeTracking: { type: Boolean, default: true },
        autoApproveDrivers: { type: Boolean, default: false },

        // ── Ride Pricing Configuration ──────────────────────────────────────────
        // Categories: MOTO, EVMOTO, AUTO, EVAUTO, GO, EVGO, PRIME, XL
        pricing: {
            MOTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" },
                default: {}
            },
            EVMOTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" },
                default: {}
            },
            AUTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" },
                default: {}
            },
            EVAUTO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" },
                default: {}
            },
            GO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" },
                default: {}
            },
            EVGO: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.5" },
                default: {}
            },
            PRIME: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" },
                default: {}
            },
            XL: {
                baseFare: { type: String, default: "0" },
                costPerKm: { type: String, default: "0" },
                perMinRate: { type: String, default: "0" },
                minFare: { type: String, default: "0" },
                nightCharge: { type: String, default: "0" },
                surgeCap: { type: String, default: "1.8" },
                default: {}
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
        },

        // ── Audit ──────────────────────────────────────────────────────────────
        version: { type: Number, default: 1 },
        updatedAt: { type: Date },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true }
);

SystemConfigSchema.pre("save", function () {
    if (this.isModified()) {
        this.version = (this.version || 1) + 1;
        this.updatedAt = new Date();
    }
});

export default mongoose.model("SystemConfig", SystemConfigSchema);
