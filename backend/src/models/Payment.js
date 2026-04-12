import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Payment Schema
 *
 * Created once per Trip — at the moment the ride is marked "completed".
 * Tracks how the passenger paid and links to WalletTransaction records
 * if the wallet was involved (debit on passenger side, credit on driver side).
 *
 * Relationship chain:
 *   Trip ──► Payment ──► WalletTransaction (passenger debit)
 *                    ──► WalletTransaction (driver  credit)
 */
const PaymentSchema = new Schema(
  {
    // ── Core References ────────────────────────────────────────────────────
    trip:      { type: Schema.Types.ObjectId, ref: "Trip",      required: true, unique: true },
    passenger: { type: Schema.Types.ObjectId, ref: "User",      required: true },
    driver:    { type: Schema.Types.ObjectId, ref: "User",      required: true },

    // ── Fare Details ───────────────────────────────────────────────────────
    amount:           { type: Number, required: true },           // total fare paid by passenger
    platformFee:      { type: Number, default: 0 },               // commission deducted before driver credit
    driverEarnings:   { type: Number, default: 0 },               // amount credited to driver (amount - platformFee)

    // ── Payment Method ─────────────────────────────────────────────────────
    method: {
      type: String,
      enum: ["cash", "wallet", "upi"],
      required: true,
    },

    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },

    // ── Wallet Transaction Links (populated only when method = "wallet") ───
    passengerWalletTx: { type: Schema.Types.ObjectId, ref: "WalletTransaction" }, // debit
    driverWalletTx:    { type: Schema.Types.ObjectId, ref: "WalletTransaction" }, // credit

    // ── UPI Reference (populated only when method = "upi") ────────────────
    upiTransactionId:  { type: String, default: "" },

    // ── Refund (if cancellation triggers a refund) ─────────────────────────
    refundedAt:        { type: Date },
    refundWalletTx:    { type: Schema.Types.ObjectId, ref: "WalletTransaction" },

    paidAt:            { type: Date },                            // timestamp of successful payment
  },
  { timestamps: true }
);

PaymentSchema.index({ trip: 1 });
PaymentSchema.index({ passenger: 1, createdAt: -1 });
PaymentSchema.index({ driver:    1, createdAt: -1 });

export default mongoose.model("Payment", PaymentSchema);
