import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import FareConfig from "../models/FareConfig.js";
import SystemConfig from "../models/SystemConfig.js";
import NotificationModel from "../models/Notification.js";

// ─── Haversine distance (km) ──────────────────────────────────────────────────
const haversineKm = ([lng1, lat1], [lng2, lat2]) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Calculate fare from SystemConfig based on distance ─────────────────────────
const calcFare = async (distanceKm, vehicleType) => {
    try {
        const sys = await SystemConfig.findOne();
        
        // Default base values
        let base = 50;
        let perKm = 12;
        let surge = 1.0;
        let minimumFare = 30;

        if (sys) {
            // Mapping UI vehicle types to config keys
            const mapping = {
                "4-Wheeler": "Sedan",
                "Sedan": "Sedan",
                "SUV": "SUV",
                "Hatchback": "Hatchback",
                "Auto": "Auto",
                "Bike": "Bike"
            };
            const key = mapping[vehicleType] || "Sedan";
            const pricing = sys.pricing?.[key] || sys.pricing?.Sedan;

            if (pricing) {
                // Parse numeric values from strings like "₹50" or "₹12"
                const parseNum = (val) => {
                    if (!val) return 0;
                    const cleaned = val.toString().replace(/[^0-9.]/g, "");
                    return parseFloat(cleaned) || 0;
                };

                base = parseNum(pricing.baseFare) || base;
                perKm = parseNum(pricing.costPerKm) || perKm;
            }

            // Platform-level surge multiplier
            surge = parseFloat(sys.surgeMultiplier?.toString().replace(/[^0-9.]/g, "") || 1.0);
        }

        const raw = (base + perKm * distanceKm) * surge;
        const fullAmount = Math.max(Math.round(raw), minimumFare);

        return { 
            fullAmount, 
            baseFare: base, 
            perKmRate: perKm, 
            surgeMultiplier: surge,
            minimumFare 
        };
    } catch (error) {
        console.error("Fare Calc Error:", error);
        // Fallback hardcoded values
        const res = Math.max(Math.round(distanceKm * 12 + 50), 30);
        return { fullAmount: res, baseFare: 50, perKmRate: 12, surgeMultiplier: 1 };
    }
};

// ─── Driver: Publish a ride (no fare pre-calculation) ─────────────────────────
export const PublishRide = async (req, res) => {
    try {
        const driverId = req.user.id;
        const { source, destination, departureTime, totalSeats } = req.body;

        if (!source || !destination || !departureTime || !totalSeats) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: source, destination, departureTime, totalSeats"
            });
        }

        const driverProfile = await DriverProfileModel.findOne({ user: driverId });
        if (!driverProfile || !driverProfile.isApproved) {
            return res.status(403).json({ success: false, message: "Only approved drivers can publish rides" });
        }

        const newRide = await PublishedRideModel.create({
            driver: driverId,
            source,
            destination,
            departureTime,
            totalSeats: Number(totalSeats),
            availableSeats: Number(totalSeats),
            vehicleType: driverProfile.vehicle?.type || "Sedan",
            status: "open",
            bookings: []
        });

        res.status(201).json({
            success: true,
            message: "Ride published successfully",
            data: newRide
        });
    } catch (error) {
        console.error("Publish Ride Error:", error);
        res.status(500).json({ success: false, message: "Failed to publish ride" });
    }
};

// ─── Passenger: Get Available Rides ───────────────────────────────────────────
export const GetAvailableRides = async (req, res) => {
    try {
        const { sourceCity, destinationCity, date } = req.query;

        const filter = {
            status: { $in: ["open", "full", "active"] },
            departureTime: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Show rides from last 24h
        };

        if (sourceCity) filter["source.address"] = { $regex: sourceCity, $options: "i" };
        if (destinationCity) filter["destination.address"] = { $regex: destinationCity, $options: "i" };
        if (date) {
            const startDate = new Date(date); startDate.setHours(0, 0, 0, 0);
            const endDate   = new Date(date); endDate.setHours(23, 59, 59, 999);
            filter.departureTime = { $gte: startDate, $lte: endDate };
        }

        const rides = await PublishedRideModel.find(filter)
            .populate("driver", "name email Mobile_no profileImage")
            .sort({ departureTime: 1 });

        const enrichedRides = await Promise.all(rides.map(async (ride) => {
            const profile = await DriverProfileModel.findOne({ user: ride.driver._id });
            const rideObj = ride.toObject();
            rideObj.vehicle = profile ? {
                type: profile.vehicle?.type,
                number: profile.vehicle?.number,
                image: profile.vehicle?.vehicleImage,
            } : null;
            return rideObj;
        }));

        res.status(200).json({ success: true, data: enrichedRides });
    } catch (error) {
        console.error("Get Available Rides Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch rides" });
    }
};

// ─── Get fare estimate (for passenger preview before booking) ─────────────────
export const GetFareEstimate = async (req, res) => {
    try {
        const { rideId, passengerLat, passengerLng, destLat, destLng, bookingType, seats, distanceKm: passedDist } = req.query;

        const ride = await PublishedRideModel.findById(rideId);
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

        // ── Use passed road distance if available, else fallback to Haversine ──
        let distanceKm = parseFloat(passedDist);
        
        if (!distanceKm || isNaN(distanceKm)) {
            const pLat = parseFloat(passengerLat), pLng = parseFloat(passengerLng);
            const dLat = parseFloat(destLat),      dLng = parseFloat(destLng);
            distanceKm = (pLat && pLng && dLat && dLng)
                ? haversineKm([pLng, pLat], [dLng, dLat])
                : 0;
        }

        const fareData = await calcFare(distanceKm, ride.vehicleType || "Sedan");
        const numSeats = parseInt(seats || 1);

        const privateAmount = fareData.fullAmount;
        const sharedAmount  = Math.round(fareData.fullAmount / ride.totalSeats) * numSeats;

        res.status(200).json({
            success: true,
            data: {
                distanceKm: Math.round(distanceKm * 10) / 10,
                privateAmount,
                sharedAmountPerSeat: Math.round(fareData.fullAmount / ride.totalSeats),
                sharedTotal: sharedAmount,
                fareBreakdown: {
                    baseFare: fareData.baseFare,
                    perKmRate: fareData.perKmRate,
                    distanceKm: Math.round(distanceKm * 10) / 10,
                    surgeMultiplier: fareData.surgeMultiplier,
                }
            }
        });
    } catch (error) {
        console.error("Fare Estimate Error:", error);
        res.status(500).json({ success: false, message: "Fare estimate failed" });
    }
};

// ─── Passenger: Book a Ride ───────────────────────────────────────────────────
export const BookRide = async (req, res) => {
    try {
        const passengerId = req.user.id;
        const { rideId } = req.params;
        const {
            bookingType,
            requestedSeats,
            passengerSource,       // { address, location: { coordinates: [lng, lat] } }
            passengerDestination,  // same shape
        } = req.body;

        if (!bookingType || !["private", "shared"].includes(bookingType)) {
            return res.status(400).json({ success: false, message: "bookingType must be 'private' or 'shared'" });
        }

        const ride = await PublishedRideModel.findById(rideId).populate("driver", "name");
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
        if (ride.status !== "open" || ride.availableSeats === 0) {
            return res.status(400).json({ success: false, message: "Ride is no longer available" });
        }
        if (ride.driver._id.toString() === passengerId) {
            return res.status(400).json({ success: false, message: "Drivers cannot book their own ride" });
        }

        // ── Fare calculated from PASSENGER's actual travel distance ───────────
        const { distanceKm: passedDist } = req.body;
        let distanceKm = parseFloat(passedDist);

        if (!distanceKm || isNaN(distanceKm)) {
            const srcCoords  = passengerSource?.location?.coordinates;
            const dstCoords  = passengerDestination?.location?.coordinates;
            distanceKm = 0;
            if (srcCoords?.length === 2 && dstCoords?.length === 2 &&
                srcCoords.some(c => c !== 0) && dstCoords.some(c => c !== 0)) {
                distanceKm = haversineKm(srcCoords, dstCoords);
            }
        }

        const fareData = await calcFare(distanceKm, ride.vehicleType || "Sedan");
        const fareBreakdown = {
            baseFare:        fareData.baseFare,
            perKmRate:       fareData.perKmRate,
            distanceKm:      Math.round(distanceKm * 10) / 10,
            surgeMultiplier: fareData.surgeMultiplier,
        };

        let seatsToBook, amountPaid;

        if (bookingType === "private") {
            if (ride.bookings.some(b => b.status !== "cancelled")) {
                return res.status(400).json({ success: false, message: "Private booking unavailable — seats already partially booked" });
            }
            seatsToBook = ride.totalSeats;
            amountPaid  = fareData.fullAmount;
        } else {
            seatsToBook = Math.max(1, Number(requestedSeats || 1));
            if (seatsToBook > ride.availableSeats) {
                return res.status(400).json({ success: false, message: `Only ${ride.availableSeats} seat(s) available` });
            }
            // Shared: per-seat = fullAmount / totalSeats * seats requested
            const perSeat = Math.round(fareData.fullAmount / ride.totalSeats);
            amountPaid    = perSeat * seatsToBook;
        }

        // Push booking (status = pending until driver confirms)
        ride.bookings.push({
            passenger: passengerId,
            seats: seatsToBook,
            bookingType,
            passengerSource:      passengerSource      || ride.source,
            passengerDestination: passengerDestination || ride.destination,
            distanceKm:           Math.round(distanceKm * 10) / 10,
            amountPaid,
            fareBreakdown,
            status: "pending",
        });

        ride.availableSeats -= seatsToBook;
        if (ride.availableSeats === 0) ride.status = "full";

        await ride.save();

        // ── Notify the driver ─────────────────────────────────────────────────
        const from = passengerSource?.address      || ride.source.address;
        const to   = passengerDestination?.address || ride.destination.address;

        await NotificationModel.create({
            recipient: ride.driver._id,
            sender:    passengerId,
            title:     "New Booking Request 🚗",
            message:   `A passenger wants a ${bookingType} ride from "${from}" to "${to}" — ₹${amountPaid} for ${seatsToBook} seat(s). ${Math.round(distanceKm * 10) / 10} km.`,
            type:      "booking_request",
            link:      `/driver/dashboard/rides`,
            metadata: {
                rideId:      ride._id,
                bookingId:   ride.bookings[ride.bookings.length - 1]._id,
                bookingType,
                amountPaid,
                seats:       seatsToBook,
                distanceKm:  Math.round(distanceKm * 10) / 10,
            }
        });

        await ride.populate("driver", "name email Mobile_no profileImage");

        res.status(200).json({
            success: true,
            message: `${bookingType === "private" ? "Private" : "Shared"} ride booked! Driver will be notified.`,
            data: ride
        });
    } catch (error) {
        console.error("Book Ride Error:", error);
        res.status(500).json({ success: false, message: "Failed to book ride" });
    }
};

// ─── Driver: Confirm / Reject a booking ──────────────────────────────────────
export const RespondToBooking = async (req, res) => {
    try {
        const driverId = req.user.id;
        const { rideId, bookingId } = req.params;
        const { action } = req.body; // "confirm" | "reject"

        if (!["confirm", "reject"].includes(action)) {
            return res.status(400).json({ success: false, message: "action must be 'confirm' or 'reject'" });
        }

        const ride = await PublishedRideModel.findOne({ _id: rideId, driver: driverId });
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

        const booking = ride.bookings.id(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        if (action === "confirm") {
            booking.status = "confirmed";
        } else {
            booking.status = "cancelled";
            ride.availableSeats += booking.seats;
            if (ride.status === "full") ride.status = "open";
        }

        await ride.save();

        // Notify passenger
        await NotificationModel.create({
            recipient: booking.passenger,
            sender:    driverId,
            title:     action === "confirm" ? "Booking Confirmed ✅" : "Booking Rejected ❌",
            message:   action === "confirm"
                ? `Your ${booking.bookingType} ride booking was confirmed by the driver! Payment: ₹${booking.amountPaid} (cash to driver).`
                : `Your ${booking.bookingType} ride booking was rejected by the driver. Please search for another ride.`,
            type:      action === "confirm" ? "booking_confirmed" : "booking_rejected",
            link:      `/passenger/dashboard`,
            metadata:  { rideId, bookingId, amountPaid: booking.amountPaid }
        });

        res.status(200).json({
            success: true,
            message: `Booking ${action === "confirm" ? "confirmed" : "rejected"} successfully.`,
            data: ride
        });
    } catch (error) {
        console.error("Respond To Booking Error:", error);
        res.status(500).json({ success: false, message: "Failed to respond to booking" });
    }
};

// ─── Driver: My Published Rides ───────────────────────────────────────────────
export const GetMyPublishedRides = async (req, res) => {
    try {
        const rides = await PublishedRideModel.find({ driver: req.user.id })
            .populate("bookings.passenger", "name email Mobile_no profileImage")
            .sort({ departureTime: -1 });
        res.status(200).json({ success: true, data: rides });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching published rides" });
    }
};

// ─── Driver: Start or Complete Ride ──────────────────────────────────────────
export const UpdateRideStatus = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { status } = req.body; // "active" or "completed"
        
        const ride = await PublishedRideModel.findOne({ _id: rideId, driver: req.user.id });
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found or unauthorized" });
        
        ride.status = status;
        await ride.save();
        
        res.status(200).json({ success: true, message: `Ride marked as ${status}`, data: ride });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to update ride status" });
    }
};

// ─── Passenger: My Booked Rides ───────────────────────────────────────────────
export const GetMyBookedRides = async (req, res) => {
    try {
        const rides = await PublishedRideModel.find({ "bookings.passenger": req.user.id })
            .populate("driver", "name email Mobile_no profileImage")
            .sort({ departureTime: -1 });

        const mappedRides = rides.map(ride => {
            const rideObj = ride.toObject();
            rideObj.myBookings = rideObj.bookings.filter(b => b.passenger.toString() === req.user.id);
            return rideObj;
        });

        res.status(200).json({ success: true, data: mappedRides });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching booked rides" });
    }
};
