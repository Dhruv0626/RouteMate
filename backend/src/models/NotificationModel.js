import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "ride_request", "ride_update", "account_update", "notification"],
      default: "info"
    },
    isRead: {
      type: Boolean,
      default: false
    },
    link: {
      type: String, // Optional URL to redirect to when clicked
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Extra data like rideId, requestId, etc.
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for performance
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
