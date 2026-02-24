import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      unique: true
    },

    licenseNumber: {
      type: String,
      required: true
    },

    aadharNumber: {
      type: String,
      required: true
    },

    isApproved: {
      type: Boolean,
      default: false
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number]
      } // [longitude, latitude]
    },

    totalRides: {
      type: Number,
      default: 0
    },
    completedRides: {
      type: Number,
      default: 0
    },
    cancelledRides: {
      type: Number,
      default: 0
    },

    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    trustScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

driverProfileSchema.index({ currentLocation: "2dsphere" });

export default mongoose.model("DriverProfile", driverProfileSchema);
