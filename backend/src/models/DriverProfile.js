import mongoose from "mongoose";
const { Schema } = mongoose;

const DriverProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio:  { type: String, default: "" },

    // ── License ────────────────────────────────────────────────────────────
    // image = single collage: LEFT half = front side, RIGHT half = back side
    license: {
      number: { type: String, required: true },
      expiry: { type: Date, required: true },
      image:  { type: String, required: true },                   // Cloudinary URL (collage)
    },

    // ── Aadhar ─────────────────────────────────────────────────────────────
    // image = single collage: LEFT half = front side, RIGHT half = back side
    aadhar: {
      number: { type: String, required: true },
      image:  { type: String, required: true },                   // Cloudinary URL (collage)
    },

    // ── Vehicle ────────────────────────────────────────────────────────────
    vehicle: {
      name:             { type: String, required: true },         // e.g. "Swift Dzire"
      type:             { type: String, required: true },
      number:           { type: String, required: true },         // Registration number
      rcBookImage:      { type: String, required: true },         // Cloudinary URL
      insuranceExpiry:  { type: Date, required: true },
      insuranceImage:   { type: String, required: true },         // Cloudinary URL
      vehicleImage:     { type: String, required: true },         // Cloudinary URL (car photo)
    },

    // ── Approval ───────────────────────────────────────────────────────────
    isApproved:     { type: Boolean, default: false },
    approvedAt:     { type: Date },
    rejectionNote:  { type: String, default: "" },             // reason if admin rejects

    // ── Live Status ────────────────────────────────────────────────────────
    isOnline: { type: Boolean, default: false },

    // ── Current Location (GeoJSON — 2dsphere index for nearby queries) ─────
    currentLocation: {
      type:        { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },        // [longitude, latitude]
    },

    // ── Performance Stats ──────────────────────────────────────────────────
    stats: {
      totalRides:     { type: Number, default: 0 },
      completedRides: { type: Number, default: 0 },
      cancelledRides: { type: Number, default: 0 },
    },

    averageRating:        { type: Number, default: 0.0 },
    totalRatingsReceived: { type: Number, default: 0 },
    trustScore:           { type: Number, default: 0 },

    // ── Wallet ─────────────────────────────────────────────────────────────────
    walletBalance:    { type: Number, default: 0 },
    // UPI/Wallet trip earnings accumulate here → withdrawn to bank

    commissionWallet: { type: Number, default: 0 },
    // Pays 15% platform commission on cash trips — can go negative
    // Below commissionWalletMinThreshold from SystemConfig → new trips blocked

    // ── Weekly Schedule (embedded) ─────────────────────────────────────────
    shifts: [
      {
        day:       { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
        startTime: { type: String },                           // "HH:MM" 24hr
        endTime:   { type: String },
        isActive:  { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

DriverProfileSchema.index({ currentLocation: "2dsphere" });
DriverProfileSchema.index({ isOnline: 1, isApproved: 1 });

export default mongoose.model("DriverProfile", DriverProfileSchema);
