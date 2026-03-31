import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * SystemConfig Schema
 * Stores global application settings, pricing heuristic copies, and system-wide constants.
 */
const SystemConfigSchema = new Schema(
    {
        // ── Platform Settings ──────────────────────────────────────────────────
        commission:      { type: String, default: "15%" },     // Platform fee percentage
        maxRadius:       { type: String, default: "50km" },    // Max booking distance
        surgeMultiplier: { type: String, default: "1.0x" },    // Global surge heuristic

        // ── Pricing Metadata (Copy of FareConfig for fast frontend lookup) ──────
        pricing: {
            Sedan: {
                baseFare:  { type: String, default: "₹50" },
                costPerKm: { type: String, default: "₹12" }
            },
            SUV: {
                baseFare:  { type: String, default: "₹80" },
                costPerKm: { type: String, default: "₹18" }
            },
            Hatchback: {
                baseFare:  { type: String, default: "₹40" },
                costPerKm: { type: String, default: "₹10" }
            },
            Auto: {
                baseFare:  { type: String, default: "₹30" },
                costPerKm: { type: String, default: "₹8" }
            },
            Bike: {
                baseFare:  { type: String, default: "₹20" },
                costPerKm: { type: String, default: "₹5" }
            }
        },

        // ── Contact & Support ──────────────────────────────────────────────────
        supportEmail:    { type: String, default: "support@routemate.com" },
        contactNumber:   { type: String, default: "+91 98765 43210" },
        googleMapsKey:   { type: String, default: "" },

        // ── Social & Links ──────────────────────────────────────────────────────
        socialLinks: {
            facebook:  { type: String, default: "https://facebook.com/routemate" },
            twitter:   { type: String, default: "https://twitter.com/routemate" },
            instagram: { type: String, default: "https://instagram.com/routemate" },
            linkedin:  { type: String, default: "https://linkedin.com/company/routemate" }
        }
    },
    { timestamps: true }
);

export default mongoose.model("SystemConfig", SystemConfigSchema);
