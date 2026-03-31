import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    // ── Core Identity ──────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    Mobile_no: { type: String, default: null }, // Removed unique constraint to allow multiple users with same number if needed
    password: { type: String, required: true },            // bcrypt hashed
    role: { type: String, enum: ["passenger", "driver", "admin"], default: "passenger" },
    profileImage: { type: String, default: "" },               // Cloudinary URL

    // ── Account Status ─────────────────────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    fcmToken: { type: String, default: "" },               // push notification token

    // ── Passenger Stats (only used when role = passenger) ──────────────────
    passengerStats: {
      totalTrips: { type: Number, default: 0 },
      totalDistanceTraveled: { type: Number, default: 0 },    // in km
      averageRating: { type: Number, default: 0.0 },  // rated by drivers
      totalRatingsReceived: { type: Number, default: 0 },
      trustScore: { type: Number, default: 0 },  // 0–100
    },

    // Refresh Token Rotation — stores the latest hashed refresh token
    refreshToken: {
      type: String,
      default: null
    },

    // Auth provider for social logins
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local"
    },

    // Consolidated OTP for both verification and reset
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      purpose: { type: String, enum: ["verification", "reset"], default: null }
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
