import mongoose from "mongoose";
const { Schema } = mongoose;

const SOSSchema = new Schema(
  {
    trip:      { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: {
      type:        { type: String, default: "Point" },
      coordinates: { type: [Number] },           // [lng, lat] at SOS trigger time
    },
    triggerMethod: {
      type: String,
      enum: ["manual_button", "shake_gesture", "auto_timeout", "route_deviation"],
      required: true,
    },
    emergencyToken:       { type: String },      // unique shareable live-location token
    emergencyTokenExpiry: { type: Date },        // 24hr expiry
    status:      { type: String, enum: ["active", "resolved"], default: "active" },
    triggeredAt: { type: Date, default: Date.now },
    resolvedAt:  { type: Date },
    resolvedBy:  { type: Schema.Types.ObjectId, ref: "User" }, // admin who resolved
    notes:       { type: String, default: "" },
  },
  { timestamps: true }
);

SOSSchema.index({ emergencyToken: 1 });
SOSSchema.index({ status: 1, triggeredAt: -1 });

export default mongoose.model("SOS", SOSSchema);
