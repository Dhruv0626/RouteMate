import mongoose from "mongoose";
const { Schema } = mongoose;

// Predefined tag pool — enforce in application layer:
// FOR DRIVER:     ["Polite", "Clean Car", "On Time", "Safe Driving", "Good Route"]
// FOR PASSENGER:  ["Good Behavior", "Ready on Time", "Respectful", "No Mess"]

const ReviewSchema = new Schema(
  {
    trip:      { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    reviewer:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    target:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    direction: { type: String, enum: ["to_driver", "to_passenger"], required: true },
    rating:    { type: Number, min: 1, max: 5, required: true },
    comment:   { type: String, default: "" },
    tags:      [{ type: String }],
  },
  { timestamps: true }
);

// Prevents duplicate review from same reviewer on same trip
ReviewSchema.index({ reviewer: 1, trip: 1 }, { unique: true });

export default mongoose.model("Review", ReviewSchema);
