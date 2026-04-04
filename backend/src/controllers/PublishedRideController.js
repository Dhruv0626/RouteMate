import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import FareConfig from "../models/FareConfig.js";
import SystemConfig from "../models/SystemConfig.js";
import NotificationModel from "../models/Notification.js";
import TripModel from "../models/Trip.js";

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
        
        let baseFreq = 0;
        let perKmRate = 0;
        let surge = 1.0;

        const parseNum = (val) => {
            if (!val) return 0;
            const cleaned = val.toString().replace(/[^0-9.]/g, "");
            return parseFloat(cleaned) || 0;
        };

        if (sys) {
            // Map common labels to DB pricing keys
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
                baseFreq = parseNum(pricing.baseFare);
                perKmRate = parseNum(pricing.costPerKm);
            }

            surge = parseNum(sys.surgeMultiplier) || 1.0;
        }

        // Exact Formula: (Base + (Distance * Rate)) * Surge
        const subtotal = baseFreq + (perKmRate * distanceKm);
        const total = Math.round(subtotal * surge);

        return { 
            fullAmount: total, 
            baseFare: baseFreq, 
            perKmRate, 
            surgeMultiplier: surge,
            minimumFare: baseFreq 
        };
    } catch (error) {
        console.error("Fare Calc Error:", error);
        return { fullAmount: 0, baseFare: 0, perKmRate: 0, surgeMultiplier: 1.0, minimumFare: 0 };
    }
};

// ─── Driver: Publish a ride (no fare pre-calculation) ─────────────────────────
export const PublishRide = async (req, res) => {
    try {
        const driverId = req.user.id;
        const { source, destination, departureTime } = req.body;

        if (!source || !destination || !departureTime) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: source, destination, departureTime"
            });
        }

        const driverProfile = await DriverProfileModel.findOne({ user: driverId });
        if (!driverProfile || !driverProfile.isApproved) {
            return res.status(403).json({ success: false, message: "Only approved drivers can publish rides" });
        }

        // Optimization: Sample coordinates to reduce DB size (keep every 5th point)
        const rawCoords = req.body.routeCoords || [];
        const sampledCoords = rawCoords.filter((_, idx) => idx % 5 === 0);

        const newRide = await PublishedRideModel.create({
            driver: driverId,
            source,
            destination,
            departureTime,
            totalSeats: 1,
            availableSeats: 1,
            vehicleType: driverProfile.vehicle?.type || "Sedan",
            routeCoords: sampledCoords, 
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
        const { sourceCity, destinationCity, date, srcLat, srcLng, dstLat, dstLng } = req.query;

        const filter = {
            status: "open", 
            departureTime: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
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

        // ── Advanced Route-Aware Proximity Filter ──
        const MAX_PICK_KM = 3.0; // Stricter 3km limit
        const pSrc = (srcLat && srcLng) ? [parseFloat(srcLng), parseFloat(srcLat)] : null;
        const pDst = (dstLat && dstLng) ? [parseFloat(dstLng), parseFloat(dstLat)] : null;

        const filtered = rides.filter(ride => {
            // Coordinate check for Source (Pickup)
            if (pSrc) {
                // Check if passenger's pickup is near NO part of the route
                const driverSrc = ride.source.location.coordinates;
                const distToStart = haversineKm(pSrc, driverSrc);

                // If not near the start, check the entire path
                if (distToStart > MAX_PICK_KM) {
                    const coords = ride.routeCoords || [];
                    if (!coords.length) return false; // Hide if we have no path data and start is far

                    // Check path waypoints (sampled every 5th point for speed)
                    let isNearPath = false;
                    for (let i = 0; i < coords.length; i += 5) {
                        if (haversineKm(pSrc, coords[i]) <= MAX_PICK_KM) {
                            isNearPath = true;
                            break;
                        }
                    }
                    if (!isNearPath) return false;
                }
            }

            // Coordinate check for Destination (Drop-off)
            if (pDst) {
                const driverDst = ride.destination.location.coordinates;
                const distToDst = haversineKm(pDst, driverDst);
                if (distToDst > MAX_PICK_KM) return false;
            }

            return true;
        });

        const enrichedRides = await Promise.all(filtered.map(async (ride) => {
            const profile = await DriverProfileModel.findOne({ user: ride.driver._id });
            const rideObj = ride.toObject();

            // ── LIVE DISTANCE ──
            const driverCoords = profile?.currentLocation?.coordinates;
            const isValidGps = driverCoords && driverCoords[0] !== 0 && driverCoords[1] !== 0;

            if (pSrc && isValidGps) {
                const distToDriver = haversineKm(pSrc, driverCoords);
                rideObj.distanceKm = Math.round(distToDriver * 10) / 10;
            } else {
                rideObj.distanceKm = null;
            }

            // ── DYNAMIC PRICING: Calculate price for this SPECIFIC ride's category ──
            // Estimate road distance as 1.3x straight-line distance for more accurate browsing fares
            const straightLineDist = (pSrc && pDst) ? haversineKm(pSrc, pDst) : haversineKm(ride.source.location.coordinates, ride.destination.location.coordinates);
            const estimatedRoadDist = straightLineDist * 1.3;
            
            const fareData = await calcFare(estimatedRoadDist, ride.vehicleType || "Sedan");
            rideObj.price = fareData.fullAmount;
            rideObj.fareBreakdown = fareData;

            rideObj.vehicle = profile ? {
                type: profile.vehicle?.type,
                number: profile.vehicle?.number,
                image: profile.vehicle?.vehicleImage,
            } : null;

            // Remove legacy seat logic
            delete rideObj.availableSeats;
            delete rideObj.totalSeats;

            return rideObj;
        }));

        res.status(200).json({ success: true, count: enrichedRides.length, data: enrichedRides });
    } catch (error) {
        console.error("Get Available Rides Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch rides" });
    }
};

// ─── Get fare estimate (for passenger preview before booking) ─────────────────
export const GetFareEstimate = async (req, res) => {
    try {
        const { rideId, passengerLat, passengerLng, destLat, destLng, seats, distanceKm: passedDist } = req.query;

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
        const finalPrice = fareData.fullAmount;

        res.status(200).json({
            success: true,
            data: {
                distanceKm: Math.round(distanceKm * 10) / 10,
                totalFare: finalPrice,
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
            passengerSource,       // { address, location: { coordinates: [lng, lat] } }
            passengerDestination,  // same shape
            distanceKm: passedDist
        } = req.body;

        const ride = await PublishedRideModel.findById(rideId).populate("driver", "name");
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
        if (ride.status !== "open") {
            return res.status(400).json({ success: false, message: "Ride is no longer available" });
        }
        if (ride.driver._id.toString() === passengerId) {
            return res.status(400).json({ success: false, message: "Drivers cannot book their own ride" });
        }

        // ── Fare calculated from PASSENGER's actual travel distance ───────────
        let distanceKm = parseFloat(passedDist);

        if (!distanceKm || isNaN(distanceKm)) {
            const srcCoords  = passengerSource?.location?.coordinates;
            const dstCoords  = passengerDestination?.location?.coordinates;
            distanceKm = 0;
            if (srcCoords?.length === 2 && dstCoords?.length === 2 &&
                srcCoords.some(c => c !== 0) && dstCoords.some(c => c !== 0)) {
                // Apply same 1.3x road-path correction as browsing for consistency
                distanceKm = haversineKm(srcCoords, dstCoords) * 1.3;
            }
        }

        const fareData = await calcFare(distanceKm, ride.vehicleType || "Sedan");
        const amountPaid = fareData.fullAmount;

        const fareBreakdown = {
            baseFare:        fareData.baseFare,
            perKmRate:       fareData.perKmRate,
            distanceKm:      Math.round(distanceKm * 10) / 10,
            surgeMultiplier: fareData.surgeMultiplier,
        };

        // Push booking (status = pending until driver confirms)
        ride.bookings.push({
            passenger: passengerId,
            seats: 1,
            bookingType: "private",
            passengerSource:      passengerSource      || ride.source,
            passengerDestination: passengerDestination || ride.destination,
            distanceKm:           Math.round(distanceKm * 10) / 10,
            amountPaid,
            fareBreakdown,
            status: "pending",
        });

        ride.availableSeats = 0;
        ride.status = "full";

        await ride.save();

        // ── Notify the driver ─────────────────────────────────────────────────
        const from = passengerSource?.address      || ride.source.address;
        const to   = passengerDestination?.address || ride.destination.address;

        await NotificationModel.create({
            recipient: ride.driver._id,
            sender:    passengerId,
            title:     "New Ride Booking 🚗",
            message:   `A passenger requested a ride — ₹${amountPaid} total fare.`,
            type:      "booking_request",
            link:      `/driver/dashboard/ride-request/${ride._id}/${ride.bookings[ride.bookings.length - 1]._id}`,
            metadata: {
                rideId:      ride._id,
                bookingId:   ride.bookings[ride.bookings.length - 1]._id,
                amountPaid
            }
        });

        await ride.populate("driver", "name email Mobile_no profileImage");

        res.status(200).json({
            success: true,
            message: `Ride request sent! Driver will be notified.`,
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
            ride.status = "active"; 

            // ── CREATE TRIP FOR LIVE TRACKING ──────────────────────────────────
            await TripModel.create({
                passenger: booking.passenger,
                driver:    ride.driver,
                phase:     "matched",
                source: {
                    address:  booking.passengerSource?.address || ride.source.address,
                    location: {
                        type:        "Point",
                        coordinates: booking.passengerSource?.location?.coordinates || ride.source.location.coordinates
                    }
                },
                destination: {
                    address:  booking.passengerDestination?.address || ride.destination.address,
                    location: {
                        type:        "Point",
                        coordinates: booking.passengerDestination?.location?.coordinates || ride.destination.location.coordinates
                    }
                },
                distanceEstimate: booking.distanceKm,
                fare: {
                    total: booking.amountPaid
                },
                otp: Math.floor(1000 + Math.random() * 9000).toString(), // Generate 4-digit OTP
                paymentStatus: "pending"
            });
        } else {
            booking.status = "cancelled";
            ride.status = "open";
        }

        await ride.save();

        // Notify passenger
        await NotificationModel.create({
            recipient: booking.passenger,
            sender:    driverId,
            title:     action === "confirm" ? "Booking Confirmed ✅" : "Booking Rejected ❌",
            message:   action === "confirm"
                ? `Your ride booking was confirmed by the driver! Payment: ₹${booking.amountPaid} (cash to driver).`
                : `Your ride booking was rejected by the driver. Please search for another ride.`,
            type:      action === "confirm" ? "booking_confirmed" : "booking_rejected",
            link:      `/passenger/dashboard/my-rides`,
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
