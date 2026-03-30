import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["ride_update", "payment", "promo", "system", "sos"],
      default: "system",
    },
    metadata: { type: Schema.Types.Mixed },                   // e.g. { tripId, amount }
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", NotificationSchema);
