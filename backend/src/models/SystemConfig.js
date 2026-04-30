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

        // ── Social & Links ──────────────────────────────────────────────────────
        socialLinks: {
            facebook: { type: String, default: "" },
            twitter: { type: String, default: "" },
            instagram: { type: String, default: "" },
            linkedin: { type: String, default: "" }
        },

        // ── Financial & Wallet Configuration ──────────────────────────────────
        platformAccountUserId: { type: Schema.Types.ObjectId, ref: "User" },
        commissionWalletMinThreshold: { type: Number, default: -150 },
        commissionWalletWarningLevel: { type: Number, default: -50 },
        withdrawalMinAmount: { type: Number, default: 100 },
        withdrawalReserveBalance: { type: Number, default: 50 },
        withdrawalDailyMax: { type: Number, default: 50000 },
        referralBonusAmount: { type: Number, default: 0 },
        referralBonusExpiryDays: { type: Number, default: 30 },
        // 0 = no expiry; set by superadmin

        // ── Audit ──────────────────────────────────────────────────────────────
        updatedAt: { type: Date },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true }
);

/**
 * Seed function to initialize the system configuration if it doesn't exist.
 */
export const seedSystemConfig = async () => {
    try {
        const config = await mongoose.model("SystemConfig").findOneAndUpdate(
            {},
            { $set: { updatedAt: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log("System configuration seeded/verified.");
        return config;
    } catch (error) {
        console.error("Error seeding system configuration:", error);
    }
};

SystemConfigSchema.pre("save", function () {
    if (this.isModified()) {
        this.updatedAt = new Date();
    }
});

export default mongoose.model("SystemConfig", SystemConfigSchema);
