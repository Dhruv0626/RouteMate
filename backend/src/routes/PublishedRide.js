import express from "express";
import {
    PublishRide,
    GetAvailableRides,
    GetFareEstimate,
    BookRide,
    RespondToBooking,
    UpdateRideStatus,
    GetMyPublishedRides,
    GetSingleRide,
    GetMyBookedRides
} from "../controllers/PublishedRideController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

router.get("/:rideId", authMiddleware, GetSingleRide);

// ── Driver routes ─────────────────────────────────────────────────────────────
router.post("/publish",           authMiddleware, authorizeRoles("driver", "admin"), PublishRide);
router.get("/my-published",       authMiddleware, authorizeRoles("driver", "admin"), GetMyPublishedRides);
router.patch("/:rideId/bookings/:bookingId/respond", authMiddleware, authorizeRoles("driver", "admin"), RespondToBooking);
router.patch("/:rideId/status",   authMiddleware, authorizeRoles("driver", "admin"), UpdateRideStatus);

// ── Passenger routes ──────────────────────────────────────────────────────────
router.get("/available",          authMiddleware, GetAvailableRides);
router.get("/fare-estimate",      authMiddleware, GetFareEstimate);
router.post("/book/:rideId",      authMiddleware, BookRide);
router.get("/my-booked",         authMiddleware, GetMyBookedRides);

export default router;
