import mongoose from "mongoose";
const { Schema } = mongoose;

const WalletTransactionSchema = new Schema(
  {
    user:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, enum: ["credit", "debit"], required: true },
    amount:       { type: Number, required: true },
    balanceAfter: { type: Number, required: true },            // snapshot AFTER this transaction
    affectsBalance: { type: Boolean, default: true },          // If false, balanceAfter is just a snapshot, no delta applied
    description:  { type: String, default: "" },
    reference: {
      type: String,
      enum: ["trip", "topup", "refund", "promo", "withdrawal", "referral"],
    },
    referenceId:     { type: Schema.Types.ObjectId },             // e.g. tripId
    commissionAmount:{ type: Number },    // platform's cut (trip transactions)
    driverEarning:   { type: Number },    // driver's share  (trip transactions)
    expiresAt:       { type: Date },      // For promo credits
    isExpired:       { type: Boolean, default: false }
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ user: 1, createdAt: -1 });

import User from "./User.js";

WalletTransactionSchema.statics.createTransaction = async function(txData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(txData.user).session(session);
        if (!user) throw new Error("User not found for wallet transaction");

        const delta = txData.type === "credit" ? txData.amount : -txData.amount;
        user.walletBalance = (user.walletBalance || 0) + delta;
        txData.balanceAfter = user.walletBalance;

        const [tx] = await this.create([txData], { session });
        await user.save({ session });
        
        await session.commitTransaction();
        session.endSession();
        return tx;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export default mongoose.model("WalletTransaction", WalletTransactionSchema);
