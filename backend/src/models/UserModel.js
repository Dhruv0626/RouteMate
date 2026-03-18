import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    Mobile_no: {
      type: String,
      required: false,
      default: null
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "driver", "passenger"],
      default: "passenger"
    },

    isBlocked: {
      type: Boolean,
      default: false
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

    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
