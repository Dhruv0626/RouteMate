import mongoose from "mongoose";
import { emitNotification } from "../utils/SocketManager.js";
import { sendPushNotification } from "../utils/PushNotifyUtil.js";

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User" }, // Optional for system-wide logs
    sender: { type: Schema.Types.ObjectId, ref: "User" }, // Admin or actor
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "system" },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },                   // e.g. { tripId, amount }
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ─── INSTANT DISPATCH HOOK ───
// This ensures EVERY notification created anywhere in the app 
// is instantly pushed via Sockets (In-app) AND Firebase (Top-bar).
NotificationSchema.post("save", function (doc) {
  if (doc.recipient) {
    // 1. In-app Socket Signal
    emitNotification(doc.recipient, doc);

    // 2. Native Top-bar Push (via Firebase Admin)
    sendPushNotification(doc.recipient, doc);
  }
});

export default mongoose.model("Notification", NotificationSchema);
