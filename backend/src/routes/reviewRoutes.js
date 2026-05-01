import express from "express";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";
import {
  createReview,
  getTripReviews,
  getUserReviews,
  hideReview,
  getAllReviews
} from "../controllers/ReviewController.js";

const router = express.Router();

// POST /api/reviews
router.post("/", authMiddleware, createReview);

// GET /api/reviews/all (Admin only)
router.get("/all", authMiddleware, authorizeRoles("admin", "superadmin"), getAllReviews);

// GET /api/reviews/trip/:tripId
router.get("/trip/:tripId", authMiddleware, getTripReviews);

// GET /api/reviews/user/:userId
router.get("/user/:userId", authMiddleware, getUserReviews);

// PATCH /api/reviews/:reviewId/hide (Admin only)
router.patch("/:reviewId/hide", authMiddleware, authorizeRoles("admin", "superadmin"), hideReview);

export default router;
