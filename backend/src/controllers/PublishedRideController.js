import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import SystemConfig from "../models/SystemConfig.js";
import NotificationModel from "../models/Notification.js";
import TripModel from "../models/Trip.js";
import UserModel from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { getIO, emitToAdmins } from "../utils/SocketManager.js";
import { calculateFareDetails } from "../utils/PriceEngine.js";
import { notifyUser, notifyAdmins } from "../utils/NotifyUtil.js";

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

// ─── Help: Platform Stats (Requests & Drivers) ────────────────────────────────
const getPlatformStats = async () => {
    try {
        // Supply = Total Drivers Online
        const available_drivers = await DriverProfileModel.countDocuments({ isOnline: true, isApproved: true });

        // Demand = Total trips created in the last 15 minutes (active interest)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const total_requests = await TripModel.countDocuments({
            createdAt: { $gte: fifteenMinsAgo }
        });

        return {
            total_requests: Math.max(total_requests, 2), // Lower floor for more realistic ratios
            available_drivers: Math.max(available_drivers, 5)
        };
    } catch (error) {
        console.error("🔴 Platform Stats Error:", error.message);
        return { total_requests: 5, available_drivers: 10 };
    }
};

// ─── Help: Check if current time is night (10PM - 6AM) in IST ─────────────────
const isNightTime = (date = new Date()) => {
    const d = new Date(date);
    // Convert to IST (+5.5 hours) for server-side checks (Render is UTC)
    const istHour = new Date(d.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    // Night charge logic: 10 PM to 6 AM
    return istHour >= 22 || istHour < 6;
};

// ─── Smart Ride Price Calculation Engine (RouteMAte) ─────────────────────────
const calcFare = async ({
    category,
    distanceKm,
    timeMin = 20,
    isNight = false
}) => {
    try {
        const sys = await SystemConfig.findOne();
        if (!sys) throw new Error("System configuration not found");

        const catKey = category.toUpperCase();
        const pricing = sys.pricing[catKey];
        if (!pricing) throw new Error(`Category ${category} not found in system config`);

        const parse = (val) => {
            if (!val) return 0;
            const cleaned = val.toString().replace(/[^\d.]/g, "");
            return parseFloat(cleaned || "0");
        };

        const stats = await getPlatformStats();
        const is_ev = ["EVMOTO", "EVAUTO", "EVGO"].includes(catKey);

        const fareData = calculateFareDetails({
            category: category.toLowerCase(),
            is_ev,
            base_fare: parse(pricing.baseFare),
            per_km_rate: parse(pricing.costPerKm),
            per_min_rate: parse(pricing.perMinRate || 0.5), // Fallback to 0.5 if not set
            night_charge: parse(pricing.nightCharge),
            min_fare: parse(pricing.minFare),
            surge_cap: parse(pricing.surgeCap || (is_ev ? 1.5 : 1.8)),
            distance_km: distanceKm,
            time_min: timeMin,
            is_night: isNight,
            total_requests: stats.total_requests,
            available_drivers: stats.available_drivers
        });

        if (fareData.error) throw new Error(fareData.message);

        // Map internal names to controller expected names for backward compatibility
        return {
            ...fareData,
            baseFare: fareData.base_fare,
            distanceFare: fareData.distance_charge,
            timeFare: fareData.time_charge,
            nightFare: fareData.night_charge_applied,
            surgeFare: Math.round(fareData.final_price - fareData.subtotal_after_night),
            surgeMultiplier: fareData.surge_multiplier,
            surgedTotal: fareData.final_price,
            totalWithTax: fareData.final_price // Tax is 0%
        };
    } catch (error) {
        console.error("🔴 RouteMate Fare Engine Error:", error.message);
        return {
            error: "Calculation failed",
            message: error.message,
            final_price: 150 // Fallback minimum
        };
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

        const sys = await SystemConfig.findOne().lean();
        const threshold = sys?.commissionWalletMinThreshold ?? -150;
        if ((driverProfile.commissionWallet || 0) < threshold) {
            return res.status(403).json({
                success: false,
                message: `Commission wallet is below threshold (₹${threshold}). Please topup to accept rides.`
            });
        }

        // Optimization: Sample coordinates to reduce DB size (keep every 5th point)
        const rawCoords = req.body.routeCoords || [];
        const sampledCoords = rawCoords.filter((_, idx) => idx % 5 === 0);

        const newRide = await PublishedRideModel.create({
            driver: driverId,
            source,
            destination,
            departureTime,
            vehicleType: (driverProfile.vehicle?.type || "PRIME").toUpperCase(),
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
        const { sourceCity, destinationCity, date, srcLat, srcLng, dstLat, dstLng, distanceKm: passedDist } = req.query;

        const filter = {
            status: "open",
            departureTime: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            // Mandatory Ahmedabad restriction
            $or: [
                { "source.address": { $regex: "Ahmedabad", $options: "i" } },
                { "destination.address": { $regex: "Ahmedabad", $options: "i" } }
            ]
        };

        if (sourceCity) {
            filter["source.address"] = { $regex: sourceCity, $options: "i" };
        }
        if (destinationCity) filter["destination.address"] = { $regex: destinationCity, $options: "i" };
        if (date) {
            // date is YYYY-MM-DD
            const d = new Date(date);
            // Calculate IST midnight in UTC
            const startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0) - (5.5 * 60 * 60 * 1000));
            const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000) - 1);
            filter.departureTime = { $gte: startDate, $lte: endDate };
        }

        const rides = await PublishedRideModel.find(filter)
            .populate("driver", "name email Mobile_no profileImage")
            .sort({ departureTime: 1 });

        // ── Advanced Route-Aware Proximity Filter ──
        const MAX_PICK_KM = 15.0; // Expanded 15km limit to show more matching rides
        const pSrc = (srcLat && srcLng) ? [parseFloat(srcLng), parseFloat(srcLat)] : null;
        const pDst = (dstLat && dstLng) ? [parseFloat(dstLng), parseFloat(dstLat)] : null;

        const filtered = rides.filter(ride => {
            const coords = ride.routeCoords || [];
            let pickupIdx = -1;
            let dropoffIdx = -1;

            const driverSrc = ride.source.location.coordinates;
            const driverDst = ride.destination.location.coordinates;

            // 1. Pickup Check: Start Point or Path
            if (pSrc) {
                if (haversineKm(pSrc, driverSrc) <= MAX_PICK_KM) {
                    pickupIdx = 0;
                } else if (coords.length > 0) {
                    for (let i = 0; i < coords.length; i += 2) {
                        if (haversineKm(pSrc, coords[i]) <= MAX_PICK_KM) {
                            pickupIdx = i;
                            break;
                        }
                    }
                }
                // If still not found, check final destination as a last resort (unlikely for pickup but safe)
                if (pickupIdx === -1 && haversineKm(pSrc, driverDst) <= MAX_PICK_KM) pickupIdx = 999998;

                if (pickupIdx === -1) return false;
            }

            // 2. Drop-off Check: End Point or Path
            if (pDst) {
                if (haversineKm(pDst, driverDst) <= MAX_PICK_KM) {
                    dropoffIdx = 999999;
                } else if (coords.length > 0) {
                    const startSearch = (pickupIdx !== -1 && pickupIdx !== 999998) ? pickupIdx : 0;
                    for (let i = startSearch; i < coords.length; i += 2) {
                        if (haversineKm(pDst, coords[i]) <= MAX_PICK_KM) {
                            dropoffIdx = i;
                            break;
                        }
                    }
                }
                if (dropoffIdx === -1) return false;
            }

            // 3. Directional Check: Only if both matched indices are valid waypoints
            if (pickupIdx !== -1 && dropoffIdx !== -1 && pickupIdx !== 999998 && dropoffIdx !== 999999) {
                if (dropoffIdx <= pickupIdx) return false;
            }

            return true;
        });

        // ── Step 1: Calculate global platform stats ONCE for this request ──
        const stats = await getPlatformStats();

        const enrichedRides = await Promise.all(filtered.map(async (ride) => {
            const profile = await DriverProfileModel.findOne({ user: ride.driver._id });
            const rideObj = ride.toObject();

            // ── LIVE DISTANCE ──
            const driverCoords = profile?.currentLocation?.coordinates;
            const isValidGps = driverCoords && driverCoords[0] !== 0 && driverCoords[1] !== 0;

            if (isValidGps) {
                rideObj.driverLocation = driverCoords; // [lng, lat] used for precise ETA calculation on frontend
            }

            if (pSrc && isValidGps) {
                const distToDriver = haversineKm(pSrc, driverCoords);
                rideObj.distanceKm = Math.round(distToDriver * 10) / 10;
            } else {
                rideObj.distanceKm = null;
            }

            // ── DYNAMIC PRICING: Calculate price for this SPECIFIC ride's category ──
            const straightLineDist = (pSrc && pDst) ? haversineKm(pSrc, pDst) : haversineKm(ride.source.location.coordinates, ride.destination.location.coordinates);
            const estimatedRoadDist = passedDist ? parseFloat(passedDist) : (straightLineDist * 1.3);

            const fareData = await calcFare({
                category: ride.vehicleType || "PRIME",
                distanceKm: estimatedRoadDist,
                timeMin: estimatedRoadDist * 2, // 2 mins per km estimate
                isNight: isNightTime(ride.departureTime)
            });

            rideObj.price = fareData.final_price;
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
        const { rideId, passengerLat, passengerLng, destLat, destLng, seats, distanceKm: passedDist, durationMin: passedTime } = req.query;

        const ride = await PublishedRideModel.findById(rideId);
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

        // ── Use passed road distance if available, else fallback to Haversine ──
        let distanceKm = parseFloat(passedDist);

        if (!distanceKm || isNaN(distanceKm)) {
            const pLat = parseFloat(passengerLat), pLng = parseFloat(passengerLng);
            const dLat = parseFloat(destLat), dLng = parseFloat(destLng);
            distanceKm = (pLat && pLng && dLat && dLng)
                ? haversineKm([pLng, pLat], [dLng, dLat])
                : 0;
        }

        const fareData = await calcFare({
            category: ride.vehicleType || "PRIME",
            distanceKm,
            timeMin: parseFloat(passedTime) || (distanceKm * 2),
            isNight: isNightTime(ride.departureTime)
        });
        const finalPrice = fareData.final_price;

        res.status(200).json({
            success: true,
            data: {
                distanceKm: Math.round(distanceKm * 10) / 10,
                totalFare: finalPrice,
                fareBreakdown: fareData
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
            distanceKm: passedDist,
            durationMin: passedTime
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
            const srcCoords = passengerSource?.location?.coordinates;
            const dstCoords = passengerDestination?.location?.coordinates;
            distanceKm = 0;
            if (srcCoords?.length === 2 && dstCoords?.length === 2 &&
                srcCoords.some(c => c !== 0) && dstCoords.some(c => c !== 0)) {
                // Apply same 1.3x road-path correction as browsing for consistency
                distanceKm = haversineKm(srcCoords, dstCoords) * 1.3;
            }
        }

        const fareData = await calcFare({
            category: ride.vehicleType || "PRIME",
            distanceKm,
            timeMin: parseFloat(passedTime) || (distanceKm * 2),
            isNight: isNightTime(ride.departureTime)
        });
        const amountPaid = fareData.totalWithTax;

        const mappedFareBreakdown = {
            baseFare: fareData.baseFare || 0,
            distanceFare: fareData.distanceFare || 0,
            timeFare: fareData.timeFare || 0,
            nightFare: fareData.nightFare || 0,
            surgeFare: fareData.surgeFare || 0,
            surgeMultiplier: fareData.surgeMultiplier || 1.0,
            surgedTotal: fareData.surgedTotal || 0,
            totalWithTax: fareData.totalWithTax || 0,
            co2Saved: fareData.co2_saved_kg || 0
        };

        // Push booking (status = pending until driver confirms)
        ride.bookings.push({
            passenger: passengerId,
            bookingType: "private",
            passengerSource: passengerSource || ride.source,
            passengerDestination: passengerDestination || ride.destination,
            distanceKm: Math.round(distanceKm * 10) / 10,
            amountPaid,
            fareBreakdown: mappedFareBreakdown,
            status: "pending",
        });

        // ── MARK RIDE AS BOOKED ──
        ride.status = "booked";
        await ride.save();

        // ── Notify the driver ─────────────────────────────────────────────────
        const from = passengerSource?.address || ride.source.address;
        const to = passengerDestination?.address || ride.destination.address;

        const sys = await SystemConfig.findOne();
        const platformCommission = sys ? parseFloat(sys.commission || "0") : 0;

        await NotificationModel.create({
            recipient: ride.driver._id,
            sender: passengerId,
            title: "New Ride Booking 🚗",
            message: `A passenger requested a ride — Final Price: ₹${amountPaid}.`,
            type: "booking_request",
            link: `/driver/dashboard/ride-request/${ride._id}/${ride.bookings[ride.bookings.length - 1]._id}`,
            metadata: {
                rideId: ride._id,
                bookingId: ride.bookings[ride.bookings.length - 1]._id,
                amountPaid,
                platformFeePercentage: platformCommission,
                motive: "booking_request"
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
    let trip = null;
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
            trip = await TripModel.create({
                passenger: booking.passenger,
                driver: ride.driver,
                publishedRide: ride._id, // LINK TO PUBLISHED RIDE
                phase: "matched",
                vehicleTypeRequested: (ride.vehicleType || "PRIME").toUpperCase(),
                source: {
                    address: booking.passengerSource?.address || ride.source.address,
                    location: {
                        type: "Point",
                        coordinates: booking.passengerSource?.location?.coordinates || ride.source.location.coordinates
                    }
                },
                destination: {
                    address: booking.passengerDestination?.address || ride.destination.address,
                    location: {
                        type: "Point",
                        coordinates: booking.passengerDestination?.location?.coordinates || ride.destination.location.coordinates
                    }
                },
                distanceEstimate: booking.distanceKm,
                fare: {
                    total: booking.amountPaid, // backward compat
                    baseFare: booking.fareBreakdown?.baseFare || 0,
                    distanceFare: booking.fareBreakdown?.distanceFare || 0,
                    timeFare: booking.fareBreakdown?.timeFare || 0,
                    nightFare: booking.fareBreakdown?.nightFare || 0,
                    surgeFare: booking.fareBreakdown?.surgeFare || 0,
                    surgedTotal: booking.fareBreakdown?.surgedTotal || 0,
                    totalWithTax: booking.fareBreakdown?.totalWithTax || booking.amountPaid,
                    co2Saved: booking.fareBreakdown?.co2Saved || 0
                },
                surgeMultiplier: booking.fareBreakdown?.surgeMultiplier || 1.0,
                otp: Math.floor(1000 + Math.random() * 9000).toString(), // Generate 4-digit OTP
                paymentStatus: "pending"
            });
        } else {
            // Updated: Set status to cancelled instead of deleting
            // This allows the passenger to see the "REJECTED" status in their dashboard
            booking.status = "cancelled";
            booking.rejectedAt = new Date();
            ride.status = "open";
        }

        await ride.save();

        const sys = await SystemConfig.findOne();
        const platformCommission = sys ? parseFloat(sys.commission || "0") : 0;

        // Notify passenger
        await NotificationModel.create({
            recipient: booking.passenger,
            sender: driverId,
            title: action === "confirm" ? "Booking Confirmed ✅" : "Booking Rejected ❌",
            message: action === "confirm"
                ? `Your ride booking was confirmed! Provide OTP: ${trip?.otp || "----"} to the driver to start the trip. Final Price: ₹${booking.amountPaid}.`
                : `Your ride booking was rejected by the driver. Please search for another ride.`,
            type: action === "confirm" ? "booking_confirmed" : "booking_rejected",
            link: `/passenger/dashboard/my-rides`,
            metadata: {
                rideId,
                bookingId,
                amountPaid: booking.amountPaid,
                otp: trip?.otp,
                platformFeePercentage: platformCommission,
                motive: action === "confirm" ? "booking_confirmed" : "booking_rejected"
            }
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
        console.log(`[GetMyPublishedRides] Fetching rides for driver: ${req.user.id}`);
        const rides = await PublishedRideModel.find({ driver: req.user.id })
            .populate({
                path: "bookings.passenger",
                select: "name email Mobile_no profileImage"
            })
            .sort({ departureTime: -1 })
            .lean(); // Use lean for performance and to avoid Mongoose doc issues on live

        res.status(200).json({ success: true, data: rides });
    } catch (error) {
        console.error("🔴 Error fetching published rides:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching published rides",
            error: process.env.NODE_ENV === "production" ? undefined : error.message
        });
    }
};

// ─── Driver: Start or Complete Ride ──────────────────────────────────────────
export const UpdateRideStatus = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { status, otp } = req.body; // "arrived", "active" (start) or "completed"

        const ride = await PublishedRideModel.findOne({ _id: rideId, driver: req.user.id });
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found or unauthorized" });

        // ── STRICT STATUS PROGRESSION GUARD ──
        // Defines the only allowed forward transitions. No backward moves ever allowed.
        const allowedTransitions = {
            open: ["full", "booked", "active", "arrived", "cancelled"],
            full: ["booked", "active", "arrived", "cancelled"],
            booked: ["active", "arrived", "cancelled"],
            active: ["arrived", "in_progress", "cancelled"],
            arrived: ["in_progress", "reached", "cancelled"], // Allow direct jump to reached if needed
            in_progress: ["reached", "cancelled"],
            reached: ["completed", "cancelled"],
            completed: [],
            cancelled: [],
        };

        const currentAllowed = allowedTransitions[ride.status] || [];

        // ── IDEMPOTENCY CHECK ──
        if (ride.status === status) {
            return res.status(200).json({
                success: true,
                message: `Ride is already in '${status}' status.`,
                data: ride
            });
        }

        if (!currentAllowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change ride status from '${ride.status}' to '${status}'. Invalid transition.`
            });
        }


        if (status === "in_progress") {
            if (!otp) return res.status(400).json({ success: false, message: "OTP is required to start the ride" });

            // Find matched or arrived trips for this ride
            const tripsToStart = await TripModel.find({ publishedRide: rideId, phase: { $in: ["matched", "arrived"] } });
            if (tripsToStart.length === 0) return res.status(400).json({ success: false, message: "No trips to start" });

            // Check if ANY matched trip matches this OTP
            const validTrip = tripsToStart.find(t => t.otp === otp);
            if (!validTrip) return res.status(400).json({ success: false, message: "Invalid OTP. Please check with your passenger." });
        }

        // ── UPDATE DRIVER STATS ──
        if (status === "completed" && ride.status !== "completed") {
            await DriverProfileModel.findOneAndUpdate(
                { user: req.user.id },
                {
                    $set: { isOnline: false },
                    $inc: {
                        "stats.totalRides": 1,
                        "stats.completedRides": 1
                    }
                }
            );
        }

        if (status === "cancelled" && ride.status !== "cancelled") {
            await DriverProfileModel.findOneAndUpdate(
                { user: req.user.id },
                { $inc: { "stats.cancelledRides": 1 } }
            );
        }

        ride.status = status;
        await ride.save();

        // ── EMIT SOCKET STATUS UPDATE ──
        const io = getIO();
        if (io) {
            io.to(rideId).emit("ride_status_update", { rideId, status });

            // Emit to each confirmed passenger's personal room for global redirect
            if (ride.bookings && ride.bookings.length > 0) {
                ride.bookings.forEach(b => {
                    if (b.status === "confirmed") {
                        io.to(b.passenger.toString()).emit("ride_status_update", { rideId, status });
                    }
                });
            }
            console.log(`🚀 PublishedRideController: Emitted status [${status}] to Ride ${rideId} and Passengers`);
        }

        const tripPhase = status === "in_progress" ? "ongoing"
            : status === "reached" ? "reached_destination"
                : status === "completed" ? "completed"

                    : status === "arrived" ? "arrived"
                        : status === "cancelled" ? "cancelled"
                            : "matched";

        const eligiblePhases = {
            arrived: { $in: ["matched"] },
            in_progress: { $in: ["matched", "arrived"] },
            reached: { $in: ["arrived", "ongoing"] },
            completed: { $in: ["ongoing", "reached_destination"] },
            cancelled: { $in: ["matched", "arrived", "ongoing", "reached_destination"] },
        };

        const query = { publishedRide: rideId, phase: eligiblePhases[status] || { $ne: "cancelled" } };
        if (status === "in_progress") query.otp = otp;

        const trips = await TripModel.find(query);

        for (const trip of trips) {
            trip.phase = tripPhase;

            if (status === "cancelled") {
                trip.cancelledAt = new Date();

                const booking = ride.bookings.find(b => b.passenger.toString() === trip.passenger.toString());
                if (booking) booking.status = "cancelled";

                await NotificationModel.create({
                    recipient: trip.passenger,
                    sender: req.user.id,
                    title: "Ride Cancelled ❌",
                    message: "The driver has cancelled the ride.",
                    type: "ride_cancelled",
                    link: "/passenger/dashboard/my-rides",
                    metadata: {
                        rideId,
                        motive: "ride_cancelled"
                    }
                });
            }

            if (status === "completed") {
                trip.completedAt = new Date();
                await UserModel.findByIdAndUpdate(trip.passenger, {
                    $inc: { "passengerStats.totalTrips": 1 }
                });

                // ── Financial Breakdown for Notification ──
                const totalFare = trip.fare?.total || 0;
                const sysConfig = await SystemConfig.findOne();
                const commStr = sysConfig?.commission;
                const parsedComm = parseFloat(String(commStr).replace(/[^0-9.]/g, ""));
                const commPercent = isNaN(parsedComm) ? 15 : parsedComm;
                const platformEarnings = Math.round((totalFare * commPercent) / 100 * 100) / 100;
                const driverPayout = Math.round((totalFare - platformEarnings) * 100) / 100;
                const driverPercent = 100 - commPercent;

                // ── Emit Real-time Notification to Admins ──
                emitToAdmins({
                    title: "Trip Completed! 💰",
                    message: `Ride ${rideId.slice(-6).toUpperCase()} done. Fare: ₹${totalFare} | App Revenue: ₹${platformEarnings.toFixed(2)} (${commPercent}%) | Driver: ₹${driverPayout.toFixed(2)} (${driverPercent}%)`,
                    type: "trip_completed",
                    metadata: {
                        rideId,
                        totalFare,
                        platformEarnings,
                        driverPayout,
                        platformPercent: commPercent,
                        driverPercent: driverPercent,
                        category: "finance"
                    }
                });


                // ── Referral Bonus Logic ──
                const passenger = await UserModel.findById(trip.passenger);
                if (passenger && passenger.referredBy && (passenger.passengerStats?.totalTrips || 0) === 1) {
                    const { default: WalletTransaction } = await import("../models/WalletTransaction.js");
                    const bonus = sysConfig?.referralBonusAmount || 0;

                    if (bonus > 0) {
                        const expiryDays = sysConfig?.referralBonusExpiryDays || 0;
                        const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

                        await WalletTransaction.createTransaction({
                            user: passenger.referredBy,
                            type: "credit",
                            amount: bonus,
                            reference: "referral",
                            description: `Referral bonus for ${passenger.name}'s first trip completion.`,
                            expiresAt
                        });

                        // ── Send Notification to Referrer ──
                        await NotificationModel.create({
                            recipient: passenger.referredBy,
                            title: "Referral Bonus Credited! 🎁",
                            message: `₹${bonus} credited to your wallet for referring ${passenger.name}. This amount is usable for ${expiryDays > 0 ? expiryDays : 'unlimited'} days.`,
                            type: "promo",
                            metadata: {
                                bonusAmount: bonus,
                                refereeName: passenger.name,
                                expiryDays
                            }
                        });
                    }
                }
            }

            if (status === "reached") {
                trip.reachedAt = new Date();
                // Notify passenger to pay
                await NotificationModel.create({
                    recipient: trip.passenger,
                    sender: req.user.id,
                    title: "Destination Reached! 📍",
                    message: "You have reached your destination. Please complete the payment to finish the trip.",
                    type: "payment_request",
                    link: `/passenger/dashboard/my-rides`,
                    metadata: {
                        rideId,
                        tripId: trip._id,
                        amount: trip.fare?.total,
                        motive: "payment_request"
                    }
                });
            }

            if (status === "in_progress") {
                trip.startedAt = new Date();
                trip.otp = "-";
            }

            if (status === "arrived") {
                trip.driverArrivedAt = new Date();
                const sys = await SystemConfig.findOne();
                const platformCommission = sys ? parseFloat(sys.commission || "0") : 0;

                await NotificationModel.create({
                    recipient: trip.passenger,
                    sender: req.user.id,
                    title: "Driver Arrived! 🚗",
                    message: "Your driver has arrived at the pickup location. Please meet your driver to start the trip.",
                    type: "driver_arrived",
                    link: "/passenger/dashboard/my-rides",
                    metadata: {
                        rideId,
                        platformFeePercentage: platformCommission,
                        motive: "driver_arrived"
                    }
                });
            }

            await trip.save();
        }

        res.status(200).json({ success: true, message: `Ride marked as ${status}`, data: ride });
    } catch (e) {
        console.error("Update Ride Status Error:", e);
        res.status(500).json({ success: false, message: "Failed to update ride status" });
    }
};

// ─── Passenger: My Booked Rides ───────────────────────────────────────────────
// ─── Shared: Get Single Ride ──────────────────────────────────────────────────
export const GetSingleRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        let ride = await PublishedRideModel.findById(rideId)
            .populate("driver", "name email Mobile_no profileImage")
            .populate("bookings.passenger", "name email Mobile_no profileImage");

        if (!ride) {
            // Check if it's a Trip ID
            const TripModel = (await import("../models/Trip.js")).default;
            const trip = await TripModel.findById(rideId)
                .populate("driver", "name email Mobile_no profileImage")
                .populate("passenger", "name email Mobile_no profileImage");

            if (!trip) {
                return res.status(404).json({ success: false, message: "Ride/Trip not found" });
            }

            // Return trip structured similarly to a ride for the frontend
            const tripObj = trip.toObject();
            return res.status(200).json({
                success: true,
                data: {
                    ...tripObj,
                    status: tripObj.phase, // frontend expects .status
                    isTripOnly: true
                }
            });
        }

        const rideObj = ride.toObject();

        // Find associated trip to get OTP if user is the passenger
        const TripModel = (await import("../models/Trip.js")).default;
        const trip = await TripModel.findOne({ publishedRide: rideId, passenger: req.user.id });

        if (trip) {
            rideObj.otp = trip.otp;
            rideObj.tripId = trip._id;
            rideObj.fare = trip.fare; // Use trip fare if available
        } else if (rideObj.bookings?.length > 0) {
            // Fallback: Use first confirmed booking fare
            const booking = rideObj.bookings.find(b => b.status === "confirmed") || rideObj.bookings[0];
            rideObj.fare = { total: booking.amountPaid || booking.fareBreakdown?.totalWithTax || 0 };
        }

        res.status(200).json({ success: true, data: rideObj });
    } catch (error) {
        console.error("GetSingleRide Error:", error);
        res.status(500).json({ success: false, message: "Error fetching ride details" });
    }
};

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

// ─── Driver: Submit Late Reason (Zone 2+) ────────────────────────────────────
/**
 * POST /api/published-rides/:rideId/late-reason
 * Body: { reason: "traffic"|"vehicle_issue"|"personal"|"other", newDepartureTime?: ISO string }
 *
 * Driver provides a reason for their delay and optionally a new departure time.
 * All confirmed passengers receive an updated ETA notification.
 */
export const SubmitLateReason = async (req, res) => {
    try {
        const driverId = req.user.id;
        const { rideId } = req.params;
        const { reason, newDepartureTime } = req.body;

        const validReasons = ["traffic", "vehicle_issue", "personal", "other"];
        if (!reason || !validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: `Invalid reason. Must be one of: ${validReasons.join(", ")}`
            });
        }

        const ride = await PublishedRideModel.findOne({ _id: rideId, driver: driverId });
        if (!ride) {
            return res.status(404).json({ success: false, message: "Ride not found or unauthorized" });
        }

        if (ride.noShowHandled || ride.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Ride has already been auto-cancelled" });
        }

        // Update late reason on the ride
        ride.lateReason = reason;

        const reasonLabels = {
            traffic: "🚗 Traffic Issue",
            vehicle_issue: "🔧 Vehicle Issue",
            personal: "👤 Personal Reason",
            other: "🕐 Other Reason"
        };
        const reasonLabel = reasonLabels[reason];

        let updatedETA = null;
        if (newDepartureTime) {
            const parsedTime = new Date(newDepartureTime);
            if (!isNaN(parsedTime.getTime())) {
                ride.newDepartureTime = parsedTime;
                updatedETA = parsedTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit", minute: "2-digit", hour12: true
                });
            }
        }

        await ride.save();

        // Notify all confirmed passengers about the reason + new ETA
        const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
        for (const booking of confirmedBookings) {
            await notifyUser({
                userId: booking.passenger,
                senderId: driverId,
                title: "🔔 Driver Delay Update",
                message: updatedETA
                    ? `Your driver reported a delay due to: ${reasonLabel}. New estimated departure: ${updatedETA}.`
                    : `Your driver reported a delay due to: ${reasonLabel}. Please wait — they will depart as soon as possible.`,
                type: "info",
                link: `/passenger/live-tracking/${rideId}`,
                metadata: {
                    rideId,
                    reason,
                    newDepartureTime: ride.newDepartureTime,
                    motive: "late_reason_submitted"
                }
            });
        }

        // Socket: push updated info to passengers
        const io = getIO();
        if (io) {
            for (const booking of confirmedBookings) {
                io.to(booking.passenger.toString()).emit("ride_late_update", {
                    rideId,
                    zone: ride.lateZone,
                    reason,
                    reasonLabel,
                    newDepartureTime: ride.newDepartureTime,
                    message: updatedETA
                        ? `Driver delayed: ${reasonLabel}. New ETA: ${updatedETA}`
                        : `Driver delayed: ${reasonLabel}. Departing soon.`
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Late reason submitted. Passengers have been notified.",
            data: {
                rideId,
                reason,
                newDepartureTime: ride.newDepartureTime
            }
        });
    } catch (error) {
        console.error("SubmitLateReason Error:", error);
        res.status(500).json({ success: false, message: "Failed to submit late reason" });
    }
};

