import mongoose from "mongoose";
const { Schema } = mongoose;

const BookingSchema = new Schema({
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Passenger's pickup/dropoff points
    passengerSource: {
        address: { type: String },
        location: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
    },
    passengerDestination: {
        address: { type: String },
        location: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
    },

    // Fare computed at booking time from passenger's actual travel distance
    distanceKm: { type: Number, default: 0 },
    amountPaid: { type: Number, required: true },
    fareBreakdown: {
        baseFare: { type: Number },
        distanceFare: { type: Number },
        timeFare: { type: Number },
        nightFare: { type: Number },
        surgeFare: { type: Number },
        surgeMultiplier: { type: Number },
        surgedTotal: { type: Number },
        taxAmount: { type: Number },
        totalWithTax: { type: Number },
        co2Saved: { type: Number }
    },

    paymentMethod: { type: String, enum: ["cash", "wallet", "upi"], default: "cash" },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    bookedAt: { type: Date, default: Date.now },
    rejectedAt: { type: Date, default: null }
});

const PublishedRideSchema = new Schema(
    {
        driver: { type: Schema.Types.ObjectId, ref: "User", required: true },

        source: {
            address: { type: String, required: true },
            location: {
                type: { type: String, default: "Point" },
                coordinates: { type: [Number], required: true },
            },
        },

        destination: {
            address: { type: String, required: true },
            location: {
                type: { type: String, default: "Point" },
                coordinates: { type: [Number], required: true },
            },
        },

        departureTime: { type: Date, required: true },
        vehicleType: { type: String },

        status: {
            type: String,
            enum: ["open", "booked", "active", "arrived", "in_progress", "reached", "completed", "cancelled", "expired"],
            default: "open"
        },

        // ── Late Departure Tracking ─────────────────────────────────────────
        lateZone: { type: Number, default: 0 },            // 0 = on-time, 1-4 = zone
        lateReason: { type: String, enum: ["traffic", "vehicle_issue", "personal", "other", null], default: null },
        lateMinutes: { type: Number, default: 0 },         // filled by cron automatically
        newDepartureTime: { type: Date, default: null },    // driver-set updated time (Zone 2+)
        zone1AlertSentAt: { type: Date, default: null },   // 1-min silent reminder timestamp
        zone1PassengerSentAt: { type: Date, default: null }, // 5-min passenger ETA notification
        zone2AlertSentAt: { type: Date, default: null },
        zone3AlertSentAt: { type: Date, default: null },
        zone4CancelledAt: { type: Date, default: null },
        noShowHandled: { type: Boolean, default: false },  // prevents double-processing

        // Full list of route waypoints [lng, lat] from OSRM
        routeCoords: {
            type: [[Number]],
            default: []
        },

        bookings: [BookingSchema]
    },
    { timestamps: true }
);

PublishedRideSchema.index({ "source.location": "2dsphere" });
PublishedRideSchema.index({ "destination.location": "2dsphere" });
PublishedRideSchema.index({ departureTime: 1, status: 1 });

export default mongoose.model("PublishedRide", PublishedRideSchema);
