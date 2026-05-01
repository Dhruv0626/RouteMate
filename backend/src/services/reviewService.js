import mongoose from "mongoose";
import Review from "../models/Review.js";
import User from "../models/User.js";
import DriverProfile from "../models/DriverProfile.js";
import Trip from "../models/Trip.js";
import { calculateDriverTrustScore, calculatePassengerTrustScore } from "../utils/calculateTrustScore.js";

// Helper function to simulate sending admin notifications
const sendAdminNotification = async (message) => {
  console.log(`[ADMIN NOTIFICATION]: ${message}`);
  // Add real notification logic here if needed (e.g. creating a Notification document)
};

// Helper function to send user notification
const sendUserNotification = async (userId, message) => {
  console.log(`[USER NOTIFICATION] to ${userId}: ${message}`);
};

export const triggerPostReviewActions = async (review) => {
  try {
    const { trip: tripId, reviewer, target, direction, rating } = review;

    // STEP 1: Mutual Reveal Check
    const tripReviews = await Review.find({ trip: tripId });
    const hasToDriver = tripReviews.some((r) => r.direction === "to_driver");
    const hasToPassenger = tripReviews.some((r) => r.direction === "to_passenger");

    if (hasToDriver && hasToPassenger) {
      await Trip.findByIdAndUpdate(tripId, { reviewsRevealed: true });
    }

    // STEP 3: Low Rating Alert System
    let targetUser = await User.findById(target);
    
    // Rule C - Block Notification to Admin (< 2.0)
    if (rating < 2.0) {
      await sendAdminNotification(`URGENT: User ${target} received rating below 2.0 — consider blocking`);
      await User.findByIdAndUpdate(target, { blockReviewPending: true });
    } 
    // Rule B - Flag to Admin (< 2.5)
    else if (rating < 2.5) {
      await sendAdminNotification(`User ${target} received rating below 2.5 — review required`);
      await User.findByIdAndUpdate(target, { isFlagged: true });
    }
    // Rule A - Soft Alert (monitor)
    else {
      if (direction === "to_driver" && rating <= 3.5) {
        await sendAdminNotification(`Driver ${target} received ≤ 3.5 rating on trip ${tripId}`);
      } else if (direction === "to_passenger" && rating <= 3.0) {
        await sendUserNotification(target, `Warning: You received a low rating (≤ 3.0) on your recent trip.`);
      }
    }

    // STEP 2: Recalculate Stats & Trust Score
    const targetReviews = await Review.find({ target, isHidden: false });
    const averageRating = targetReviews.length > 0 
      ? targetReviews.reduce((sum, r) => sum + r.rating, 0) / targetReviews.length 
      : 0;
    
    let totalTagsReceived = 0;
    targetReviews.forEach(r => {
      if (r.tags && r.tags.length > 0) totalTagsReceived += r.tags.length;
    });
    // Assuming all predefined tags are positive
    const positiveTagCount = totalTagsReceived;

    if (direction === "to_driver") {
      const driverProfile = await DriverProfile.findOne({ user: target });
      if (driverProfile) {
        // Prepare stats for trust score
        const driverStats = {
          averageRating,
          completedRides: driverProfile.stats?.completedRides || 0,
          totalRides: driverProfile.stats?.totalRides || 0,
          cancelledRides: driverProfile.stats?.cancelledRides || 0,
          totalTagsReceived,
          positiveTagCount
        };

        const trustScore = calculateDriverTrustScore(driverStats);

        // Update DriverProfile
        await DriverProfile.findByIdAndUpdate(driverProfile._id, {
          averageRating,
          totalTagsReceived,
          positiveTagCount,
          trustScore
        });
      }
    } else if (direction === "to_passenger") {
      // Re-fetch user to get latest stats
      targetUser = await User.findById(target);
      
      const passengerStats = targetUser.passengerStats || {};
      const statsForScore = {
        averageRating,
        totalTrips: passengerStats.totalTrips || 0,
        cancellationRate: passengerStats.cancellationRate || 0,
        totalTagsReceived,
        positiveTagCount
      };

      const trustScore = calculatePassengerTrustScore(statsForScore);

      // Update User passengerStats
      await User.findByIdAndUpdate(target, {
        "passengerStats.averageRating": averageRating,
        "passengerStats.totalTagsReceived": totalTagsReceived,
        "passengerStats.positiveTagCount": positiveTagCount,
        "passengerStats.trustScore": trustScore
      });
    }

  } catch (err) {
    console.error("Error in post review trigger:", err);
  }
};
