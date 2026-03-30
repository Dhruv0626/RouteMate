import mongoose from "mongoose";
const { Schema } = mongoose;

const WalletTransactionSchema = new Schema(
  {
    user:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, enum: ["credit", "debit"], required: true },
    amount:       { type: Number, required: true },
    balanceAfter: { type: Number, required: true },            // snapshot AFTER this transaction
    description:  { type: String, default: "" },
    reference: {
      type: String,
      enum: ["trip", "topup", "refund", "promo", "withdrawal"],
    },
    referenceId:  { type: Schema.Types.ObjectId },             // e.g. tripId
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("WalletTransaction", WalletTransactionSchema);
