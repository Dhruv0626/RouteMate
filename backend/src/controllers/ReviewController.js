import mongoose from "mongoose";
import Review from "../models/Review.js";
import Trip from "../models/Trip.js";
import DriverProfile from "../models/DriverProfile.js";
import { triggerPostReviewActions } from "../services/reviewService.js";
import { DRIVER_TAGS, PASSENGER_TAGS } from "../constants/reviewTags.js";

// POST /api/reviews
export const createReview = async (req, res) => {
  try {
    const { tripId, rating, comment, tags, direction } = req.body;
    const reviewerId = req.user.id;

    // 1. Fetch trip
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    // 2. Validate user participation in trip
    const isPassenger = trip.passenger.toString() === reviewerId;
    const isDriver = trip.driver && trip.driver.toString() === reviewerId;
    
    if (!isPassenger && !isDriver) {
      return res.status(403).json({ success: false, message: "You were not part of this trip" });
    }

    // 3. Determine target user based on direction
    let targetUserId = null;
    if (direction === "to_driver") {
      if (!isPassenger) return res.status(400).json({ success: false, message: "Only passenger can review driver" });
      targetUserId = trip.driver;
    } else if (direction === "to_passenger") {
      if (!isDriver) return res.status(400).json({ success: false, message: "Only driver can review passenger" });
      targetUserId = trip.passenger;
    } else {
      return res.status(400).json({ success: false, message: "Invalid direction" });
    }

    // 4. Check trip status and time window
    if (trip.phase !== "completed") {
      return res.status(400).json({ success: false, message: "Cannot review an incomplete trip" });
    }

    const completionTime = trip.completedAt || trip.updatedAt;
    const hoursSinceCompletion = (new Date() - new Date(completionTime)) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 48) {
      return res.status(400).json({ success: false, message: "Review window has expired (48 hours)" });
    }

    // 5. Check if review already exists
    const existingReview = await Review.findOne({ reviewer: reviewerId, trip: tripId });
    if (existingReview) {
      return res.status(409).json({ success: false, message: "Review already submitted for this trip. Editing is not allowed." });
    }

    // 6. Validate tags manually (schema also does this, but good for custom error message)
    if (tags && tags.length > 0) {
      const allowedTags = direction === "to_driver" ? DRIVER_TAGS : PASSENGER_TAGS;
      const invalidTags = tags.filter(t => !allowedTags.includes(t));
      if (invalidTags.length > 0) {
        return res.status(400).json({ success: false, message: "Invalid tags provided" });
      }
    }

    // 7. Create review
    const review = await Review.create({
      trip: tripId,
      reviewer: reviewerId,
      target: targetUserId,
      direction,
      rating,
      comment,
      tags
    });

    // 8. Trigger post-review service asynchronously
    // We don't await this so we can return response fast, or we can await it depending on needs.
    // The spec says "After a review is successfully saved, call this service."
    triggerPostReviewActions(review).catch(console.error);

    return res.status(201).json({ success: true, message: "Review submitted successfully", review });

  } catch (error) {
    console.error("[ReviewController] createReview Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create review" });
  }
};

// GET /api/reviews/trip/:tripId
export const getTripReviews = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId).select("reviewsRevealed passenger driver");
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    // Validate if the requester was part of the trip (optional, but good for privacy)
    const userId = req.user.id;
    if (trip.passenger.toString() !== userId && (!trip.driver || trip.driver.toString() !== userId) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const reviews = await Review.find({ trip: tripId })
      .populate("reviewer", "name profileImage")
      .populate("target", "name profileImage");

    const isRevealed = trip.reviewsRevealed || req.user.role === "admin";

    // If not revealed, mask the content for everyone except admins
    const processedReviews = reviews.map(r => {
      if (isRevealed) return r;
      
      const rObj = r.toObject();
      // Mask sensitive fields
      rObj.rating = 0;
      rObj.comment = "";
      rObj.tags = [];
      rObj.isRevealed = false;
      return rObj;
    });

    return res.status(200).json({ 
      success: true, 
      reviews: processedReviews, 
      reviewsRevealed: isRevealed 
    });

  } catch (error) {
    console.error("[ReviewController] getTripReviews Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch trip reviews" });
  }
};

// Helper for trust score badge
const getTrustBadge = (score) => {
  if (score >= 80) return { badge: "Trusted", color: "green" };
  if (score >= 50) return { badge: "Average", color: "yellow" };
  return { badge: "Low Trust", color: "red" };
};

// GET /api/reviews/user/:userId
export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find visible reviews
    const reviews = await Review.find({ target: userId, isHidden: false })
      .populate("reviewer", "name profileImage")
      .sort({ createdAt: -1 });

    // Minimum rides guard logic
    let averageRating = null;
    let isNewDriver = false;
    let trustScore = 0;

    // Check if user is a driver
    const driverProfile = await DriverProfile.findOne({ user: userId });
    if (driverProfile) {
      const completedRides = driverProfile.stats?.completedRides || driverProfile.completedRides || 0;
      if (completedRides < 5) {
        isNewDriver = true;
      } else {
        averageRating = driverProfile.averageRating || 0;
      }
      trustScore = driverProfile.trustScore || 0;
    } else {
      // It's a passenger
      const user = await mongoose.model("User").findById(userId).select("passengerStats");
      averageRating = user?.passengerStats?.averageRating || 0;
      trustScore = user?.passengerStats?.trustScore || 0;
    }

    const trustBadge = getTrustBadge(trustScore);

    return res.status(200).json({ 
      success: true, 
      reviews,
      stats: {
        newDriver: isNewDriver,
        averageRating: isNewDriver ? null : averageRating,
        trustScore,
        trustBadge
      }
    });

  } catch (error) {
    console.error("[ReviewController] getUserReviews Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user reviews" });
  }
};

// PATCH /api/admin/reviews/:reviewId/hide
export const hideReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    // Assuming role check is done in middleware
    const review = await Review.findByIdAndUpdate(reviewId, { isHidden: true }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    // Since a review is hidden, we might need to trigger post review actions again to recalculate score
    // without the hidden review.
    // triggerPostReviewActions(review); 

    return res.status(200).json({ success: true, message: "Review hidden successfully", review });
  } catch (error) {
    console.error("[ReviewController] hideReview Error:", error);
    return res.status(500).json({ success: false, message: "Failed to hide review" });
  }
};

// GET /api/reviews/all (Admin Only)
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewer", "name profileImage")
      .populate("target", "name profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("[ReviewController] getAllReviews Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch all reviews" });
  }
};
