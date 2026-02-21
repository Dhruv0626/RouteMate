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
      required: true
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
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
