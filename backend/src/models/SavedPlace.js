import mongoose from "mongoose";
const { Schema } = mongoose;

const SavedPlaceSchema = new Schema(
  {
    user:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    title:   { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type:        { type: String, default: "Point" },
      coordinates: { type: [Number], required: true },         // [lng, lat]
    },
    type: {
      type: String,
      enum: ["home", "work", "favorite", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SavedPlace", SavedPlaceSchema);
