import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    vehicleType: {
      type: String,
      default: null
    },

    vehicleName: {
      type: String,
      default: null
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
        enum: ["Point"]
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

    licenseImage: {
      type: String,
      default: null
    },
    aadharImage: {
      type: String,
      default: null
    },
    vehicleImage: {
      type: String,
      default: null
    },
    rcbookimage: {
      type: String,
      default: null
    },
    insuranceimage: {
      type: String,
      default: null
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
