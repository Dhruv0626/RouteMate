import cron from "node-cron";
import PublishedRideModel from "../models/PublishedRide.js";
import DriverProfileModel from "../models/DriverProfile.js";
import TripModel from "../models/Trip.js";
import UserModel from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { notifyUser, notifyAdmins } from "./NotifyUtil.js";
import { getIO, emitToAdmins } from "./SocketManager.js";

// ─── IST helpers (Render runs UTC) ─────────────────────────────────────────────
const nowIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

// Format a Date as a readable IST time string — always uses Asia/Kolkata timezone
// regardless of the server's local timezone (e.g. Render runs UTC).
const toIST = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    let hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
};

// ─── Help: Get actual ride start timestamp based on confirmed booking ─────────
const getRideStartTs = (ride) => {
    const departureTs = new Date(ride.departureTime).getTime();
    const confirmedBooking = (ride.bookings || []).find(b => b.status === "confirmed");
    if (confirmedBooking && confirmedBooking.confirmedAt) {
        const confirmedTs = new Date(confirmedBooking.confirmedAt).getTime();
        // Timer starts at the LATER of the scheduled departure time or when the driver accepted
        return Math.max(departureTs, confirmedTs);
    }
    return departureTs;
};


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
        // Compute IST-formatted scheduled pickup time (departure + travel buffer)
        const pickupBufferMs1 = (ride.pickupEtaMins || 10) * 60 * 1000;
        const scheduledPickupTs1 = getRideStartTs(ride) + pickupBufferMs1;
        const scheduledPickupTime1 = toIST(new Date(scheduledPickupTs1));
        const updatedPickupTime1 = toIST(new Date(scheduledPickupTs1 + lateMinutes * 60 * 1000));

        // Notify driver urgently
        await notifyUser({
            userId: ride.driver,
            title: "⚠️ 5 Minutes Late — Depart Now",
            message: `You are ${lateMinutes} minutes late. Your passengers are waiting. Please depart immediately.`,
            type: "warning",
            link: `/driver/dashboard/active-rides`,
            metadata: { rideId: ride._id, zone: 1, lateMinutes, motive: "late_urgent_5min" }
        });

        // Notify all confirmed passengers with IST times
        const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
        for (const booking of confirmedBookings) {
            await notifyUser({
                userId: booking.passenger,
                title: `🕐 Driver ${lateMinutes} Minutes Late`,
                message: `Your driver is ${lateMinutes} minutes late. 📍 Original Pickup: ${scheduledPickupTime1} 🔄 Updated Pickup: ${updatedPickupTime1}\n\nYou can wait — no penalty applies yet.`,
                type: "info",
                link: `/passenger/live-tracking/${ride._id}`,
                metadata: { rideId: ride._id, zone: 1, lateMinutes, originalTime: scheduledPickupTime1, updatedTime: updatedPickupTime1, motive: "late_passenger_eta" }
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

    // Compute the ACTUAL scheduled pickup time (departure + travel buffer to passenger)
    // This is what the passenger sees on the tracking page as "Scheduled Pickup"
    const pickupBufferMs = (ride.pickupEtaMins || 10) * 60 * 1000;
    const scheduledPickupTs = getRideStartTs(ride) + pickupBufferMs;
    const scheduledTime = toIST(new Date(scheduledPickupTs));
    const updatedTime = toIST(new Date(scheduledPickupTs + lateMinutes * 60 * 1000));

    // Notify all confirmed passengers — give them Wait / Cancel choice
    const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
    for (const booking of confirmedBookings) {
        await notifyUser({
            userId: booking.passenger,
            title: `⏳ Driver ${lateMinutes} Minutes Late`,
            message: `Your driver is ${lateMinutes} minutes late. 📍 Original Pickup: ${scheduledTime} 🔄 Updated Pickup: ${updatedTime}\n\nYou can wait or cancel this ride with no penalty.`,
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
        title: "🚨 Late Pickup — 10 Min Delay",
        message: `You are ${lateMinutes} minutes late for your passenger pickups. Please provide a reason immediately: Traffic Issue, Vehicle Issue, Personal Reason, or set a new departure time.`,
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
        message: `Driver is ${lateMinutes} minutes late. You may wait or cancel with no penalty.`
    });

    ride.zone2AlertSentAt = now;
    ride.lateZone = 2;
    ride.lateMinutes = lateMinutes;
    console.log(`[DriverLateCron] Zone 2 (10-min) → Ride ${ride._id}`);
};

// ─── ZONE 3 (15–19 min late): Strong cancel push + final warning + Trust -1 ──
const handleZone3 = async (ride, lateMinutes) => {
    if (ride.zone3AlertSentAt) return; // Already handled
    const now = new Date();

    // Compute IST-formatted scheduled pickup time (departure + travel buffer)
    const pickupBufferMs3 = (ride.pickupEtaMins || 10) * 60 * 1000;
    const scheduledPickupTs3 = getRideStartTs(ride) + pickupBufferMs3;
    const scheduledTime3 = toIST(new Date(scheduledPickupTs3));
    const updatedTime3 = toIST(new Date(scheduledPickupTs3 + lateMinutes * 60 * 1000));

    // Strong notification to all confirmed passengers
    const confirmedBookings = ride.bookings.filter(b => b.status === "confirmed");
    for (const booking of confirmedBookings) {
        await notifyUser({
            userId: booking.passenger,
            title: `🚨 Driver ${lateMinutes} Minutes Late`,
            message: `Your driver is ${lateMinutes} minutes late. 📍 Original Pickup: ${scheduledTime3} 🔄 Updated Pickup: ${updatedTime3}\n\nWe strongly suggest cancelling — it's free, no penalty applies.`,
            type: "error",
            link: `/passenger/live-tracking/${ride._id}`,
            metadata: {
                rideId: ride._id,
                zone: 3,
                lateMinutes,
                originalTime: scheduledTime3,
                updatedTime: updatedTime3,
                canCancel: true,
                motive: "late_zone3_passenger"
            }
        });
    }

    // Final warning to driver — 5 more minutes before auto-cancel at 20 min
    await notifyUser({
        userId: ride.driver,
        title: "⚠️ FINAL WARNING — Auto-Cancel in 5 Min",
        message: `You are ${lateMinutes} minutes late. If you do not depart within 5 minutes, your trip will be automatically cancelled and your Trust Score will be further reduced.`,
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
    const rideDateObj = new Date(getRideStartTs(ride));
    const rideDateIST = new Date(rideDateObj.getTime() + 5.5 * 60 * 60 * 1000);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rideDate = `${rideDateIST.getUTCDate()} ${months[rideDateIST.getUTCMonth()]} ${rideDateIST.getUTCFullYear()}`;

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
        const past24Hours = new Date(now.getTime() - 24 * 3600000);

        const lateRides = await PublishedRideModel.find({
            status: { $in: ["open", "booked", "active"] },
            createdAt: { $gte: past24Hours },
            noShowHandled: false
        });

        if (lateRides.length === 0) return;

        for (const ride of lateRides) {
            // Filter for confirmed bookings (only track late pickups AFTER driver accepts)
            const confirmedBookings = (ride.bookings || []).filter(b => b.status === "confirmed");

            // Skip rides with no confirmed passengers
            if (confirmedBookings.length === 0) continue;

            // ── STEP 1: Ensure pickupEtaMins is set ──────────────────────────────
            if (!ride.pickupEtaMins || ride.pickupEtaMins === 0) {
                try {
                    const confirmedBooking = confirmedBookings[0];
                    const driverSrc = ride.source?.location?.coordinates;
                    const paxSrc = confirmedBooking?.passengerSource?.location?.coordinates;

                    if (driverSrc && paxSrc && (driverSrc[0] !== paxSrc[0] || driverSrc[1] !== paxSrc[1])) {
                        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverSrc[0]},${driverSrc[1]};${paxSrc[0]},${paxSrc[1]}?overview=false`;
                        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
                        const osrmData = await osrmRes.json();
                        if (osrmData.code === "Ok" && osrmData.routes?.[0]) {
                            ride.pickupEtaMins = Math.ceil(osrmData.routes[0].duration / 60);
                        }
                    }
                } catch {
                    // Non-blocking fallback
                }
            }

            // ── STEP 2: Compute the TRUE expected pickup deadline ─────────────────
            const scheduledTs = getRideStartTs(ride);
            const pickupBufferMs = (ride.pickupEtaMins || 10) * 60 * 1000;
            const effectivePickupDeadline = scheduledTs + pickupBufferMs;

            const lateMs = now.getTime() - effectivePickupDeadline;
            const lateMinutes = Math.floor(lateMs / 60000);

            if (lateMinutes < 1) continue; // Not late yet

            let dirty = false;

            // Emit to driver + confirmed passengers
            const emitToAll = (event, payload) => {
                const io = getIO();
                if (!io) return;
                io.to(ride.driver.toString()).emit(event, payload);
                for (const b of ride.bookings) {
                    if (b.status === "confirmed") {
                        io.to(b.passenger.toString()).emit(event, payload);
                    }
                }
            };

            // ── STEP 4: Apply graduated zone logic ────────────────────────────────
            // Zone thresholds are measured from effectivePickupDeadline (not departureTime):
            //   Zone 1 :  1–4 min late  → silent driver reminder
            //   Zone 1b:  5–9 min late  → passenger notified with ETA update
            //   Zone 2 : 10–14 min late → passenger can cancel free; driver must give reason
            //   Zone 3 : 15–19 min late → strong cancel push; Trust Score -1
            //   Zone 4 : 20+ min late   → auto-cancel; Trust Score -2

            if (lateMinutes >= 20) {
                if (!ride.lateReason) {
                    await handleZone4(ride, lateMinutes);
                    dirty = true;
                }
            } else if (lateMinutes >= 15) {
                if (!ride.zone3AlertSentAt) {
                    await handleZone3(ride, lateMinutes);
                    dirty = true;
                    emitToAll("ride_late_update", { rideId: ride._id, zone: 3, lateMinutes, canCancel: true, urgent: true });
                }
                if (!ride.zone2AlertSentAt) {
                    await handleZone2(ride, lateMinutes);
                    dirty = true;
                }
            } else if (lateMinutes >= 10) {
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
                // Zone 1: 1–10 min late
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
};
