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
    GetMyBookedRides,
    SubmitLateReason,
    DeletePublishedRide
} from "../controllers/PublishedRideController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

// ── Specific Static Routes First (To avoid param collision) ──────────────────
router.get("/available",          authMiddleware, GetAvailableRides);
router.get("/my-published",       authMiddleware, authorizeRoles("driver", "admin"), GetMyPublishedRides);
router.get("/my-booked",          authMiddleware, GetMyBookedRides);
router.get("/fare-estimate",      authMiddleware, GetFareEstimate);

// ── Dynamic Parameter Routes Last ─────────────────────────────────────────────
router.get("/:rideId",            authMiddleware, GetSingleRide);

// ── Protected Actions ─────────────────────────────────────────────────────────
router.post("/publish",           authMiddleware, authorizeRoles("driver", "admin"), PublishRide);
router.patch("/:rideId/bookings/:bookingId/respond", authMiddleware, authorizeRoles("driver", "admin"), RespondToBooking);
router.patch("/:rideId/status",   authMiddleware, authorizeRoles("driver", "admin"), UpdateRideStatus);
router.post("/book/:rideId",      authMiddleware, BookRide);
router.post("/:rideId/late-reason", authMiddleware, authorizeRoles("driver", "admin"), SubmitLateReason);
router.delete("/:rideId",         authMiddleware, authorizeRoles("driver", "admin"), DeletePublishedRide);

export default router;
