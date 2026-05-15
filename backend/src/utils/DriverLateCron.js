import cron from "node-cron";
import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import TripModel from "../models/Trip.js";
import UserModel from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { notifyUser, notifyAdmins } from "./NotifyUtil.js";
import { getIO, emitToAdmins } from "./SocketManager.js";

// ─── IST helper (Render runs UTC) ─────────────────────────────────────────────
const nowIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

// ─── Emit socket event to all confirmed passengers on a ride ──────────────────
const emitToPassengers = (ride, event, payload) => {
    const io = getIO();
    if (!io) return;
    for (const booking of ride.bookings) {
        // Emit to all passengers involved, even if status just changed
        io.to(booking.passenger.toString()).emit(event, payload);
    }
    // Also emit to the ride room itself for map closing
    io.to(ride._id.toString()).emit(event, payload);
};

// ─── ZONE 1 (1–10 min late): Silent reminder + 5-min passenger ETA ───────────
const handleZone1 = async (ride, lateMinutes) => {
    const now = new Date();

    // 1-min: send silent reminder to driver (only once)
    if (!ride.zone1AlertSentAt) {
        await notifyUser({
            userId: ride.driver,
            title: "⏰ Late Pickup Reminder",
            message: `You are running late for your passenger pickups. Please depart as soon as possible to avoid further delays.`,
            type: "warning",
            link: `/driver/dashboard/active-rides`,
            metadata: { rideId: ride._id, zone: 1, motive: "late_reminder_1min" }
        });

        ride.zone1AlertSentAt = now;
        ride.lateZone = 1;
        console.log(`[DriverLateCron] Zone 1 (late pickup reminder) → Ride ${ride._id}`);
    }

    // 5-min: notify passengers with updated ETA (only once)
    if (lateMinutes >= 5 && !ride.zone1PassengerSentAt) {
        // Notify driver urgently
        await notifyUser({
            userId: ride.driver,
            title: "⚠️ 5 Minutes Late",
            message: `You are 5 minutes late. Your passengers are waiting. Please depart immediately.`,
            type: "warning",
            link: `/driver/dashboard/active-rides`,
            metadata: { rideId: ride._id, zone: 1, lateMinutes, motive: "late_urgent_5min" }
        });

        // Notify all confirmed passengers
        const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
        for (const booking of confirmedBookings) {
            await notifyUser({
                userId: booking.passenger,
                title: "🕐 Driver Slightly Delayed",
                message: `Your driver is running a few minutes late. Updated pickup time is being calculated. We'll keep you posted.`,
                type: "info",
                link: `/passenger/live-tracking/${ride._id}`,
                metadata: { rideId: ride._id, zone: 1, lateMinutes, motive: "late_passenger_eta" }
            });
        }

        // Socket: push live updated ETA to all passengers
        emitToPassengers(ride, "ride_late_update", {
            rideId: ride._id.toString(),
            zone: 1,
            lateMinutes,
            message: "Driver is slightly delayed. Updated ETA coming soon."
        });

        ride.zone1PassengerSentAt = now;
        ride.lateMinutes = lateMinutes;
        console.log(`[DriverLateCron] Zone 1 (5-min passenger ETA) → Ride ${ride._id}`);
    }
};

// ─── ZONE 2 (10–20 min late): Passenger choice + driver mandatory reason ──────
const handleZone2 = async (ride, lateMinutes) => {
    if (ride.zone2AlertSentAt) return; // Already handled this zone
    const now = new Date();

    const scheduledTime = new Date(ride.departureTime).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true
    });
    const updatedTime = new Date(ride.departureTime.getTime() + lateMinutes * 60 * 1000)
        .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    // Notify all confirmed passengers — give them Wait / Cancel choice
    const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
    for (const booking of confirmedBookings) {
        await notifyUser({
            userId: booking.passenger,
            title: "⏳ Driver 5 Minutes Late",
            message: `Your driver is 5 minutes late.\n📍 Original Pickup: ${scheduledTime}\n⏱️ Updated Pickup: ${updatedTime}\n\nYou can wait or cancel this ride with no penalty.`,
            type: "warning",
            link: `/passenger/live-tracking/${ride._id}`,
            metadata: {
                rideId: ride._id,
                zone: 2,
                lateMinutes,
                originalTime: scheduledTime,
                updatedTime,
                canCancel: true,
                motive: "late_zone2_passenger"
            }
        });
    }

    // Notify driver — mandatory reason required
    await notifyUser({
        userId: ride.driver,
        title: "🚨 Late Pickup — 5 Min Delay",
        message: `You are 5 minutes late for your passenger pickups. Please provide a reason immediately: Traffic Issue, Vehicle Issue, Personal Reason, or set a new departure time.`,
        type: "error",
        link: `/driver/dashboard/active-rides`,
        metadata: {
            rideId: ride._id,
            zone: 2,
            lateMinutes,
            requiresReason: true,
            motive: "late_zone2_driver"
        }
    });

    // Socket: push to passengers with action buttons
    emitToPassengers(ride, "ride_late_update", {
        rideId: ride._id.toString(),
        zone: 2,
        lateMinutes,
        canCancel: true,
        message: `Driver is 5 minutes late. You may wait or cancel with no penalty.`
    });

    ride.zone2AlertSentAt = now;
    ride.lateZone = 2;
    ride.lateMinutes = lateMinutes;
    console.log(`[DriverLateCron] Zone 2 (5-min) → Ride ${ride._id}`);
};

// ─── ZONE 3 (20–30 min late): Strong cancel push + final warning + Trust -1 ──
const handleZone3 = async (ride, lateMinutes) => {
    if (ride.zone3AlertSentAt) return; // Already handled
    const now = new Date();

    // Strong notification to all confirmed passengers
    const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
    for (const booking of confirmedBookings) {
        await notifyUser({
            userId: booking.passenger,
            title: "🚨 Driver 15 Minutes Late",
            message: `Your driver is 15 minutes late. We strongly suggest cancelling this ride. Cancellation is free — please try to find another ride.`,
            type: "error",
            link: `/passenger/live-tracking/${ride._id}`,
            metadata: {
                rideId: ride._id,
                zone: 3,
                lateMinutes,
                canCancel: true,
                motive: "late_zone3_passenger"
            }
        });
    }

    // Final warning to driver — 10 more minutes before auto-cancel
    await notifyUser({
        userId: ride.driver,
        title: "⚠️ FINAL WARNING — Auto-Cancel in 5 Min",
        message: `You are 15 minutes late. If you do not depart within 5 minutes, your trip will be automatically cancelled. Trust Score penalty of -1 has been applied.`,
        type: "error",
        link: `/driver/dashboard/active-rides`,
        metadata: {
            rideId: ride._id,
            zone: 3,
            lateMinutes,
            trustPenalty: -1,
            motive: "late_zone3_driver"
        }
    });

    // Apply Trust Score -1 to driver ONLY if they haven't provided a reason
    if (!ride.lateReason) {
        await DriverProfileModel.findOneAndUpdate(
            { user: ride.driver },
            { $inc: { trustScore: -1 } }
        );
    }

    // Socket: push urgent alert to passengers
    emitToPassengers(ride, "ride_late_update", {
        rideId: ride._id.toString(),
        zone: 3,
        lateMinutes,
        canCancel: true,
        urgent: true,
        message: `Driver is 15 minutes late. Please try to find another ride.`
    });

    ride.zone3AlertSentAt = now;
    ride.lateZone = 3;
    ride.lateMinutes = lateMinutes;
    console.log(`[DriverLateCron] Zone 3 (15-min, Trust -1) → Ride ${ride._id}`);
};

// ─── ZONE 4 (30+ min late): Full auto-cancel ─────────────────────────────────
const handleZone4 = async (ride, lateMinutes) => {
    if (ride.noShowHandled) return; // Idempotency guard
    const now = new Date();

    console.log(`[DriverLateCron] Zone 4 (20-min AUTO CANCEL) → Ride ${ride._id}`);

    // 1. Cancel all bookings and process refunds
    const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");

    for (const booking of confirmedBookings) {
        booking.status = "cancelled";
        booking.rejectedAt = now;

        // Notify each passenger
        await notifyUser({
            userId: booking.passenger,
            title: "🚫 Ride Auto-Cancelled",
            message: `Your ride has been automatically cancelled — driver did not depart within 20 minutes. Your booking has been removed. Please try to find another ride.`,
            type: "error",
            link: `/passenger/dashboard/my-rides`,
            metadata: {
                rideId: ride._id,
                zone: 4,
                lateMinutes,
                motive: "late_zone4_auto_cancel"
            }
        });
    }

    // 2. Cancel pending bookings too
    ride.bookings.forEach(b => {
        if (b.status === "pending") {
            b.status = "cancelled";
            b.rejectedAt = now;
        }
    });

    // 3. Cancel all linked trips (matched phase)
    const linkedTrips = await TripModel.find({
        publishedRide: ride._id,
        phase: { $in: ["matched", "arrived"] }
    });

    for (const trip of linkedTrips) {
        trip.phase = "cancelled";
        trip.cancelledAt = now;
        trip.cancelledBy = "system";
        trip.cancellationReason = "Driver no-show — 20+ minutes late";
        await trip.save();
    }

    // 4. Mark the published ride as cancelled
    ride.status = "cancelled";
    ride.zone4CancelledAt = now;
    ride.lateZone = 4;
    ride.lateMinutes = lateMinutes;
    ride.noShowHandled = true;

    // 5. Apply Trust Score -2 to driver
    const driverProfile = await DriverProfileModel.findOneAndUpdate(
        { user: ride.driver },
        {
            $inc: {
                trustScore: -2,
                noShowCount: 1,
                "stats.cancelledRides": 1
            }
        },
        { new: true }
    );

    // 6. Notify driver
    await notifyUser({
        userId: ride.driver,
        title: "❌ Trip Auto-Cancelled — No Show",
        message: `Your ride has been automatically cancelled due to 20+ minutes of no departure. Trust Score -2 applied. Your published ride has been removed — if you need to travel, please re-publish your ride.`,
        type: "error",
        link: `/driver/dashboard/active-rides`,
        metadata: {
            rideId: ride._id,
            zone: 4,
            lateMinutes,
            trustPenalty: -2,
            motive: "late_zone4_driver"
        }
    });

    // 7. Alert admins
    const driverUser = await UserModel.findById(ride.driver).select("name").lean();
    const driverName = driverUser?.name || "Unknown Driver";
    const rideDate = new Date(ride.departureTime).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
    });

    await notifyAdmins({
        title: "🚨 Driver No-Show Alert",
        message: `Driver ${driverName} had a no-show on ${rideDate}. Ride auto-cancelled. Total no-shows: ${driverProfile?.noShowCount || 1}. ${(driverProfile?.noShowCount || 1) >= 3 ? "⚠️ THRESHOLD REACHED — Review suspension." : ""}`,
        type: "error",
        link: `/admin/dashboard/manage-users`,
        metadata: {
            rideId: ride._id,
            driverId: ride.driver,
            driverName,
            noShowCount: driverProfile?.noShowCount || 1,
            zone: 4,
            motive: "late_zone4_admin_alert"
        }
    });

    // 8. Emit admin real-time alert
    emitToAdmins({
        title: "🚨 Driver No-Show",
        message: `Driver ${driverName} — Auto-cancelled after 20+ min. No-shows: ${driverProfile?.noShowCount || 1}`,
        type: "error",
        metadata: { rideId: ride._id, driverId: ride.driver, noShowCount: driverProfile?.noShowCount || 1 }
    });

    // 9. Socket: push auto-cancel to all passengers & ride room
    const cancelPayload = {
        rideId: ride._id.toString(),
        zone: 4,
        status: "cancelled",
        message: "Ride auto-cancelled. Please try to find another ride."
    };

    emitToPassengers(ride, "ride_auto_cancelled", cancelPayload);
    
    const io = getIO();
    if (io) {
        io.to(ride._id.toString()).emit("ride_status_update", cancelPayload);
        // Also notify driver room
        io.to(ride.driver.toString()).emit("ride_status_update", cancelPayload);
    }

    console.log(`[DriverLateCron] Zone 4 complete — Ride ${ride._id} cancelled, Trust -2, noShowCount=${driverProfile?.noShowCount}`);
};

// ─── Main Cron Runner ─────────────────────────────────────────────────────────
const runDriverLateMonitor = async () => {
    try {
        const now = new Date();

        // Find all rides that:
        // - Are open or booked (not yet departed / active)
        // - Have a departureTime in the past (within last 60 min window)
        // - Haven't been fully auto-cancelled yet
        const pastWindow = new Date(now.getTime() - 60 * 60 * 1000); // 60-min lookback

        const lateRides = await PublishedRideModel.find({
            status: { $in: ["open", "booked", "active", "arrived"] },
            departureTime: { $lte: now, $gte: pastWindow },
            noShowHandled: false
        });

        if (lateRides.length === 0) return;

        console.log(`[DriverLateCron] Checking ${lateRides.length} potentially late ride(s)...`);

        for (const ride of lateRides) {
            // Filter for active bookings (pending or confirmed)
            const activeBookings = (ride.bookings || []).filter(b => ["pending", "confirmed"].includes(b.status));

            // Skip rides with no passengers - per USER request: no notifications before booking
            if (activeBookings.length === 0) continue;

            // Find earliest booking time among active bookings
            const earliestBooking = activeBookings.reduce((earliest, curr) => {
                const currTime = new Date(curr.bookedAt).getTime();
                return currTime < earliest ? currTime : earliest;
            }, Infinity);

            // Smart Base Time: Lateness starts from departureTime OR earliest booking time (whichever is LATER)
            // This ensures lateness is only tracked AFTER a passenger has booked.
            const scheduledTs = new Date(ride.departureTime).getTime();
            const baseTs = earliestBooking !== Infinity && earliestBooking > scheduledTs
                ? earliestBooking
                : scheduledTs;

            const lateMs = now.getTime() - baseTs;
            const lateMinutes = Math.floor(lateMs / 60000);

            if (lateMinutes < 1) continue; // Not late yet based on smart base time

            let dirty = false;

            // Emit to Driver too so dashboard updates real-time
            const emitToAll = (event, payload) => {
                const io = getIO();
                if (!io) return;
                // To driver
                io.to(ride.driver.toString()).emit(event, payload);
                // To passengers
                for (const b of ride.bookings) {
                    if (b.status === "confirmed") {
                        io.to(b.passenger.toString()).emit(event, payload);
                    }
                }
            };

            if (lateMinutes >= 20) {
                // ZONE 4: Auto-cancel ONLY if no reason given
                if (!ride.lateReason) {
                    await handleZone4(ride, lateMinutes);
                    dirty = true;
                }
            } else if (lateMinutes >= 15) {
                // ZONE 3: Final warning + Trust -1 (if no reason)
                if (!ride.zone3AlertSentAt) {
                    await handleZone3(ride, lateMinutes);
                    dirty = true;
                    emitToAll("ride_late_update", { rideId: ride._id, zone: 3, lateMinutes, canCancel: true, urgent: true });
                }
                if (!ride.zone2AlertSentAt) {
                    await handleZone2(ride, lateMinutes);
                    dirty = true;
                }
            } else if (lateMinutes >= 5) {
                // ZONE 2: Passenger choice + driver reason
                if (!ride.zone2AlertSentAt) {
                    await handleZone2(ride, lateMinutes);
                    dirty = true;
                    emitToAll("ride_late_update", { rideId: ride._id, zone: 2, lateMinutes, canCancel: true });
                }
                if (!ride.zone1AlertSentAt) {
                    await handleZone1(ride, lateMinutes);
                    dirty = true;
                }
            } else {
                // ZONE 1: 1–5 min
                if (!ride.zone1AlertSentAt) {
                    await handleZone1(ride, lateMinutes);
                    dirty = true;
                }
            }

            if (dirty) {
                ride.lateMinutes = lateMinutes;
                await ride.save();
            }
        }
    } catch (err) {
        console.error("[DriverLateCron] Error:", err.message);
    }
};

// ─── Export: Initialize Cron ──────────────────────────────────────────────────
/**
 * Runs every minute — checks all open/booked rides for late departures.
 * Implements graduated 4-zone warnings with auto-cancel at 30 min.
 */
export const initDriverLateCron = () => {
    cron.schedule("* * * * *", runDriverLateMonitor);
    console.log("✅ DriverLateCron: Initialized — checking late departures every minute");
};
