import mongoose from "mongoose";
const { Schema } = mongoose;

const BookingSchema = new Schema({
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seats: { type: Number, required: true },
    bookingType: { type: String, enum: ["private", "shared"], required: true },
    // Passenger's own pickup/dropoff if different from driver's full route
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
    distanceKm:  { type: Number, default: 0 },
    amountPaid:  { type: Number, required: true },
    fareBreakdown: {
        baseFare:        { type: Number },
        perKmRate:       { type: Number },
        distanceKm:      { type: Number },
        surgeMultiplier: { type: Number },
    },
    paymentMethod: { type: String, enum: ["cash", "online"], default: "cash" },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    bookedAt: { type: Date, default: Date.now }
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
        totalSeats:    { type: Number, required: true },
        availableSeats: { type: Number, required: true },
        vehicleType:   { type: String },

        status: {
            type: String,
            enum: ["open", "full", "active", "completed", "cancelled"],
            default: "open"
        },

        bookings: [BookingSchema]
    },
    { timestamps: true }
);

PublishedRideSchema.index({ "source.location": "2dsphere" });
PublishedRideSchema.index({ "destination.location": "2dsphere" });
PublishedRideSchema.index({ departureTime: 1, status: 1 });

export default mongoose.model("PublishedRide", PublishedRideSchema);
