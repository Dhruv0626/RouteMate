import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import SystemConfig from "../models/SystemConfig.js";
import NotificationModel from "../models/Notification.js";
import TripModel from "../models/Trip.js";
import UserModel from "../models/User.js";
import { getIO } from "../utils/SocketManager.js";

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

// ─── Help: Demand Ratio (Requests / Drivers) ──────────────────────────────────
const getDemandRatio = async () => {
    try {
        // Supply = Active Published Rides that are open for booking
        const supplyCount = await PublishedRideModel.countDocuments({ status: "open" });
        
        // Demand = Count all "pending" booking requests across all published rides
        const demandStats = await PublishedRideModel.aggregate([
            { $unwind: "$bookings" },
            { $match: { "bookings.status": "pending" } },
            { $count: "count" }
        ]);
        const demandCount = demandStats[0]?.count || 0;

        if (supplyCount === 0) return 1.0; 
        
        // Ratio = Demand / Supply
        // e.g. 10 people wanting 5 rides -> ratio 2.0 (High Surge)
        // e.g. 2 people wanting 10 rides -> ratio 0.2 (Standard Fare)
        return demandCount / supplyCount;
    } catch (error) {
        console.error("🔴 Demand Ratio Calc Error:", error.message);
        return 1.0;
    }
};

// ─── Help: Check if current time is night (10PM - 6AM) ─────────────────────────
const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
};

// ─── Calculate fare from SystemConfig based on distance ─────────────────────────
// ─── Smart Ride Price Calculation Engine (RouteMAte) ─────────────────────────
const calcFare = async ({
    category,
    distanceKm,
    timeMin = 20,
    demandRatio = 1.0,
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
            // Clean string from symbols like ₹, %, x and parse
            const cleaned = val.toString().replace(/[^\d.]/g, "");
            return parseFloat(cleaned || "0");
        };

        const base_fare = parse(pricing.baseFare);
        const per_km_rate = parse(pricing.costPerKm);
        const per_min_rate = parse(pricing.perMinRate);
        const night_charge = parse(pricing.nightCharge);
        const min_fare = parse(pricing.minFare);
        const surge_cap = parse(pricing.surgeCap);

        // Step 1: Subtotal = Base Fare + (Distance KM × Per KM Rate) + (Time Min × Per Min Rate)
        let subtotal = base_fare + (distanceKm * per_km_rate) + (timeMin * per_min_rate);

        // Step 2: Night Charge is FLAT - add to subtotal if it's night time
        const night_val = isNight ? night_charge : 0;
        subtotal += night_val;

        // Step 3: Calculate Surge Multiplier based on demand_ratio (Stepped Logic)
        let surge_multiplier = 1.0;
        let surge_label = "Standard Fare";

        const base_surge = parse(sys.surgeMultiplier || "1.2");

        if (demandRatio > 2.5) {
            surge_multiplier = surge_cap;
            surge_label = "Extreme Surge";
        } else if (demandRatio > 2.0) {
            surge_multiplier = 1.6;
            surge_label = "High Surge";
        } else if (demandRatio > 1.5) {
            surge_multiplier = 1.4;
            surge_label = "Medium Surge";
        } else if (demandRatio > 1.2) {
            surge_multiplier = base_surge;
            surge_label = "Low Surge";
        }

        // Never exceed the surge_cap
        if (surge_multiplier > surge_cap) {
            surge_multiplier = surge_cap;
        }

        // Step 4: Surged Total (MAX of Surge or Min Fare)
        let surgedTotalRaw = subtotal * surge_multiplier;
        const min_fare_applied = surgedTotalRaw < min_fare;
        let surgedTotal = Math.max(surgedTotalRaw, min_fare);
        
        // Final Total is now just the Surged Total (Tax logic removed)
        let finalTotal = Math.round(surgedTotal);

        // EV SPECIAL RULES: Calculate CO2 Saved
        const is_ev = ["EVMOTO", "EVAUTO", "EVGO"].includes(catKey);
        const co2_saved_kg = is_ev ? (distanceKm * 0.12) : 0;
        
        const distance_charge = distanceKm * per_km_rate;
        const time_charge = timeMin * per_min_rate;
        const surge_fare_real = surge_multiplier > 1.0 ? Math.max(0, surgedTotal - subtotal) : 0;

        return {
            category: category.toLowerCase(),
            is_ev,
            distance_km: Math.round(distanceKm * 10) / 10,
            time_min: Math.round(timeMin),
            baseFare: Math.round(base_fare),
            distanceFare: Math.round(distance_charge),
            timeFare: Math.round(time_charge),
            night_charge: Math.round(night_val),
            subtotal: Math.round(subtotal),
            surgeMultiplier: Number(surge_multiplier.toFixed(2)),
            surgeFare: Math.round(surge_fare_real),
            surge_label,
            surgedTotal: Math.round(surgedTotal),
            totalWithTax: finalTotal, // Keeping for compatibility but tax is 0%
            final_price: finalTotal,
            min_fare_applied,
            co2_saved_kg: Number(co2_saved_kg.toFixed(3)),
            currency: "INR"
        };
    } catch (error) {
        console.error("🔴 RouteMate Fare Engine Error:", error.message);
        console.error("Context:", { category, distanceKm, timeMin, demandRatio, isNight });
        return {
            error: "Calculation failed",
            message: error.message,
            final_price: 0 // Return 0 so it's visible something is wrong
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
        const { sourceCity, destinationCity, date, srcLat, srcLng, dstLat, dstLng } = req.query;

        const filter = {
            status: "open",
            departureTime: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        };

        if (sourceCity) filter["source.address"] = { $regex: sourceCity, $options: "i" };
        if (destinationCity) filter["destination.address"] = { $regex: destinationCity, $options: "i" };
        if (date) {
            const startDate = new Date(date); startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date); endDate.setHours(23, 59, 59, 999);
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

        // ── Step 1: Calculate global demand ratio ONCE for this request ──
        const demandRatio = await getDemandRatio();

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
            const estimatedRoadDist = straightLineDist * 1.3;

            const fareData = await calcFare({
                category: ride.vehicleType || "PRIME",
                distanceKm: estimatedRoadDist,
                timeMin: estimatedRoadDist * 2, // 2 mins per km estimate
                demandRatio,
                isNight: isNightTime()
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
        const { rideId, passengerLat, passengerLng, destLat, destLng, seats, distanceKm: passedDist } = req.query;

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

        const demandRatio = await getDemandRatio();
        const fareData = await calcFare({
            category: ride.vehicleType || "PRIME",
            distanceKm,
            timeMin: distanceKm * 2,
            demandRatio,
            isNight: isNightTime()
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
            const srcCoords = passengerSource?.location?.coordinates;
            const dstCoords = passengerDestination?.location?.coordinates;
            distanceKm = 0;
            if (srcCoords?.length === 2 && dstCoords?.length === 2 &&
                srcCoords.some(c => c !== 0) && dstCoords.some(c => c !== 0)) {
                // Apply same 1.3x road-path correction as browsing for consistency
                distanceKm = haversineKm(srcCoords, dstCoords) * 1.3;
            }
        }

        const demandRatio = await getDemandRatio();
        const fareData = await calcFare({
            category: ride.vehicleType || "PRIME",
            distanceKm,
            timeMin: distanceKm * 2,
            demandRatio,
            isNight: isNightTime()
        });
        const amountPaid = fareData.totalWithTax;

        const mappedFareBreakdown = {
             baseFare: fareData.baseFare || 0,
             distanceFare: fareData.distanceFare || 0,
             timeFare: fareData.timeFare || 0,
             surgeFare: fareData.surgeFare || 0,
             surgeMultiplier: fareData.surgeMultiplier || 1.0,
             surgedTotal: fareData.surgedTotal || 0,
             totalWithTax: fareData.totalWithTax || 0,
             co2Saved: fareData.co2_saved_kg || 0
        };

        // Push booking (status = pending until driver confirms)
        ride.bookings.push({
            passenger: passengerId,
            seats: 1,
            bookingType: "private",
            passengerSource: passengerSource || ride.source,
            passengerDestination: passengerDestination || ride.destination,
            distanceKm: Math.round(distanceKm * 10) / 10,
            amountPaid,
            fareBreakdown: mappedFareBreakdown,
            status: "pending",
        });

        ride.availableSeats = 0;
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
        const { status, otp } = req.body; // "arrived", "active" (start) or "completed"

        const ride = await PublishedRideModel.findOne({ _id: rideId, driver: req.user.id });
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found or unauthorized" });

        // ── VERIFY OTP IF STARTING RIDE ──
        if (status === "in_progress") {
            if (!otp) return res.status(400).json({ success: false, message: "OTP is required to start the ride" });

            // Find matched or arrived trips for this ride
            const tripsToStart = await TripModel.find({ publishedRide: rideId, phase: { $in: ["matched", "arrived"] } });
            if (tripsToStart.length === 0) return res.status(400).json({ success: false, message: "No trips to start" });

            // Check if ANY matched trip matches this OTP
            const validTrip = tripsToStart.find(t => t.otp === otp);
            if (!validTrip) return res.status(400).json({ success: false, message: "Invalid OTP. Please check with your passenger." });
        }

        ride.status = status;
        await ride.save();

        // ── EMIT SOCKET STATUS UPDATE ──
        const io = getIO();
        if (io) {
            io.to(rideId).emit("ride_status_update", { rideId, status });
            console.log(`🚀 PublishedRideController: Emitted status [${status}] to Ride ${rideId}`);
        }

        // ── UPDATE ASSOCIATED TRIPS ──
        // Map each status to the correct target phase AND the phases that are eligible
        // to be updated — this prevents dropped/unstarted trips from being swept up.
        const tripPhase = status === "in_progress" ? "ongoing"
            : status === "completed" ? "completed"
                : status === "arrived" ? "arrived"
                    : "matched";

        // Only touch trips that are in the EXPECTED phase for this transition:
        //  arrived   → only "matched" trips
        //  in_progress    → only the specific OTP trip (matched / arrived)
        //  completed → only "ongoing" trips  ← KEY FIX: never touch matched/cancelled stays
        const eligiblePhases = {
            arrived: { $in: ["matched"] },
            in_progress: { $in: ["matched", "arrived"] },
            completed: "ongoing",
        };

        const query = { publishedRide: rideId, phase: eligiblePhases[status] || { $ne: "cancelled" } };
        if (status === "in_progress") query.otp = otp; // Must match the passenger's OTP

        const trips = await TripModel.find(query);

        for (const trip of trips) {
            trip.phase = tripPhase;

            if (status === "completed") {
                // Only rides the driver explicitly completed via the map button
                trip.completedAt = new Date();
                await UserModel.findByIdAndUpdate(trip.passenger, {
                    $inc: { "passengerStats.totalTrips": 1 }
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

        // ── UPDATE DRIVER STATS ──
        if (status === "completed") {
            await DriverProfileModel.findOneAndUpdate(
                { user: req.user.id },
                {
                    $inc: {
                        "stats.totalRides": 1,
                        "stats.completedRides": 1
                    }
                }
            );
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
        const ride = await PublishedRideModel.findById(rideId)
            .populate("driver", "name email Mobile_no profileImage")
            .populate("bookings.passenger", "name email Mobile_no profileImage");
        
        if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
        
        res.status(200).json({ success: true, data: ride });
    } catch (error) {
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
