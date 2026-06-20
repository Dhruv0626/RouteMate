import mongoose from "mongoose";
const { Schema } = mongoose;

const TripSchema = new Schema(
  {
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "User" },          // null until matched
    publishedRide: { type: Schema.Types.ObjectId, ref: "PublishedRide" }, // the driver's published ride this trip belongs to

    // ── Full lifecycle tracked by phase ────────────────────────────────────
    phase: {
      type: String,
      enum: [
        "searching",     // passenger requested, finding driver
        "matched",       // driver accepted, heading to pickup
        "arrived",       // driver reached pickup point, waiting for OTP
        "ongoing",       // OTP verified, ride started
        "reached_destination", // driver reached dropoff, waiting for payment
        "completed",     // payment received, ride finished
        "cancelled",     // cancelled at any phase
      ],
      default: "searching",
    },

    // ── Locations (GeoJSON) ────────────────────────────────────────────────
    source: {
      address: { type: String, required: true },
      location: {
        type: { type: String, default: "Point" },
        coordinates: { type: [Number], required: true },       // [lng, lat]
      },
    },

    destination: {
      address: { type: String, required: true },
      location: {
        type: { type: String, default: "Point" },
        coordinates: { type: [Number], required: true },
      },
    },

    vehicleTypeRequested: {
      type: String,
      enum: ["MOTO", "EVMOTO", "AUTO", "EVAUTO", "GO", "EVGO", "PRIME", "XL"],
    },

    // ── Driver Matching ────────────────────────────────────────────────────
    driversNotified: [
      {
        driver: { type: Schema.Types.ObjectId, ref: "User" },
        notifiedAt: { type: Date, default: Date.now }
      }
    ],
    driversRejected: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date },                           // auto-cancel if no driver found

    // ── OTP ────────────────────────────────────────────────────────────────
    otp: { type: String },                             // 4-digit, shown to passenger
    otpVerified: { type: Boolean, default: false },

    // ── Distance & Duration ────────────────────────────────────────────────
    distanceEstimate: { type: Number },                        // km  — shown before ride
    durationEstimate: { type: Number },                        // min — shown before ride
    distanceActual: { type: Number },                        // km  — filled on completion
    durationActual: { type: Number },                        // min — filled on completion

    // ── Fare ───────────────────────────────────────────────────────────────
    fare: {
      baseFare: { type: Number, default: 0 },
      distanceFare: { type: Number, default: 0 },
      timeFare: { type: Number, default: 0 },
      nightFare: { type: Number, default: 0 },
      surgeFare: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      co2Saved: { type: Number, default: 0 },
      total: { type: Number, default: 0 }, // Backwards compatibility / base total
      surgedTotal: { type: Number, default: 0 },
      configVersion: { type: Number }
    },

    surgeMultiplier: { type: Number, default: 1.0 },

    // ── Payment ────────────────────────────────────────────────────────────
    paymentMethod: { type: String, enum: ["wallet", "cash", "upi"] },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },      // linked Payment record (created on completion)

    // ── Cancellation ───────────────────────────────────────────────────────
    cancelledBy: { type: String, enum: ["passenger", "driver", "system"] },
    cancellationReason: { type: String, default: "" },
    cancellationFee: { type: Number, default: 0 },
    driverCompensation: { type: Number, default: 0 },
    driverCompensationPaidAt: { type: Date },
    passengerPenaltyPaid: { type: Boolean, default: false },

    // ── Phase Timestamps ───────────────────────────────────────────────────
    matchedAt: { type: Date },
    driverArrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },

    // ── SOS Auto-Detection Fields ───────────────────────────────────────────────
    lastDistanceToDestination: { type: Number },    // km — Haversine check
    consecutiveNoProgress: { type: Number, default: 0 }, // counter — resets on progress
    passengerConfirmedSafe: { type: Boolean, default: false }, // true = SOS cancelled
    sosWarningSentAt: { type: Date },       // timestamp of last "Are you safe?" notification
    stoppedAt: { type: Date },       // when driver stopped (speed < 3 km/h)
    emergencyToken: { type: String },
    emergencyTokenExpiry: { type: Date },

    // ── Review System ────────────────────────────────────────────────────────
    reviewsRevealed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TripSchema.index({ passenger: 1, phase: 1 });
TripSchema.index({ driver: 1, phase: 1 });
TripSchema.index({ publishedRide: 1, phase: 1 });
TripSchema.index({ createdAt: -1 });

export default mongoose.model("Trip", TripSchema);
