import mongoose from "mongoose";
import { DRIVER_TAGS, PASSENGER_TAGS } from "../constants/reviewTags.js";
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    trip:      { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    reviewer:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    target:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    direction: { type: String, enum: ["to_driver", "to_passenger"], required: true },
    rating:    { type: Number, min: 1, max: 5, required: true },
    comment:   { type: String, default: "" },
    tags:      {
      type: [{ type: String }],
      validate: {
        validator: function(tagsArray) {
          if (!tagsArray || tagsArray.length === 0) return true;
          const allowedTags = this.direction === "to_driver" ? DRIVER_TAGS : PASSENGER_TAGS;
          return tagsArray.every(tag => allowedTags.includes(tag));
        },
        message: "One or more tags are invalid for the given direction."
      }
    },
    isHidden:  { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Prevents duplicate review from same reviewer on same trip
ReviewSchema.index({ reviewer: 1, trip: 1 }, { unique: true });

ReviewSchema.pre("save", async function () {
  if (this.isNew) {
    const trip = await mongoose.model("Trip").findById(this.trip);
    if (!trip) throw new Error("Trip not found");
    if (trip.phase !== "completed" && trip.status !== "completed") { 
      throw new Error("Cannot review an incomplete trip");
    }
    
    // Check 48-hour window
    const completionTime = trip.completedAt || trip.updatedAt;
    if (!completionTime) throw new Error("Trip completion time not found");
    
    const hoursSinceCompletion = (new Date() - new Date(completionTime)) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 48) {
      throw new Error("Review window has expired");
    }
  }
});

export default mongoose.model("Review", ReviewSchema);
