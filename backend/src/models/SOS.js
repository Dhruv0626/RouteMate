import mongoose from "mongoose";
const { Schema } = mongoose;

const SOSSchema = new Schema(
  {
    trip:      { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: {
      type:        { type: String, default: "Point" },
      coordinates: { type: [Number] },                        // [lng, lat] at SOS trigger time
    },
    status:      { type: String, enum: ["active", "resolved"], default: "active" },
    triggeredAt: { type: Date, default: Date.now },
    resolvedAt:  { type: Date },
    resolvedBy:  { type: Schema.Types.ObjectId, ref: "User" }, // admin who resolved
    notes:       { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SOS", SOSSchema);
