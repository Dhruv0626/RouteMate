import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import SystemConfig from "../models/SystemConfig.js";
import UserModel from "../models/User.js";
import DriverProfileModel from "../models/DriverProfile.js";
import WalletTransaction from "../models/WalletTransaction.js";
import TripModel from "../models/Trip.js";
import PublishedRideModel from "../models/PublishedRide.js";
import PaymentModel from "../models/Payment.js";
import { notifyUser } from "../utils/NotifyUtil.js";
import { getIO } from "../utils/SocketManager.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get commission rate as decimal from SystemConfig (e.g. "15" → 0.15) */
const getCommissionRate = async () => {
  const config = await SystemConfig.findOne().lean();
  const raw = config?.commission || "15";
  return parseFloat(String(raw).replace(/[^0-9.]/g, "")) / 100;
};

/** Credit/debit User.walletBalance (passengers & superadmin) */
const createUserWalletTx = async (session, { userId, type, amount, reference, referenceId, description, commissionAmount, driverEarning, affectsBalance = true }) => {
  const user = await UserModel.findById(userId).session(session);
  if (!user) throw new Error(`User not found: ${userId}`);

  if (affectsBalance) {
    const delta = type === "credit" ? amount : -amount;
    user.walletBalance = (user.walletBalance || 0) + delta;
    await user.save({ session });
  }

  const [tx] = await WalletTransaction.create([{
    user: userId, type, amount,
    balanceAfter: user.walletBalance,
    affectsBalance,
    reference, referenceId, description,
    commissionAmount, driverEarning,
  }], { session });
  return { tx, newBalance: user.walletBalance };
};

/** Credit/debit DriverProfile.walletBalance (driver earnings) */
const createDriverEarningsTx = async (session, { driverUserId, type, amount, reference, referenceId, description }) => {
  const profile = await DriverProfileModel.findOne({ user: driverUserId }).session(session);
  if (!profile) throw new Error(`DriverProfile not found: ${driverUserId}`);
  const delta = type === "credit" ? amount : -amount;
  profile.walletBalance = (profile.walletBalance || 0) + delta;
  await profile.save({ session });
  const [tx] = await WalletTransaction.create([{
    user: driverUserId, type, amount,
    balanceAfter: profile.walletBalance,
    reference, referenceId, description,
  }], { session });
  return { tx, newBalance: profile.walletBalance };
};

/** Credit/debit DriverProfile.commissionWallet */
const updateCommissionWallet = async (session, { driverUserId, delta, reference, referenceId, description }) => {
  const profile = await DriverProfileModel.findOne({ user: driverUserId }).session(session);
  if (!profile) throw new Error(`DriverProfile not found: ${driverUserId}`);
  profile.commissionWallet = (profile.commissionWallet || 0) + delta;
  await profile.save({ session });
  const type = delta >= 0 ? "credit" : "debit";
  const [tx] = await WalletTransaction.create([{
    user: driverUserId, type, amount: Math.abs(delta),
    balanceAfter: profile.commissionWallet,
    reference, referenceId, description,
  }], { session });
  return { tx, newBalance: profile.commissionWallet };
};

/** Core: split a completed trip fare between driver and platform */
const checkAndRewardReferrer = async (session, passengerId, tripId) => {
  try {
    const passenger = await UserModel.findById(passengerId).session(session);
    if (!passenger || !passenger.referredBy) return;

    // Only reward on FIRST completed trip
    const completedTripsCount = await TripModel.countDocuments({
      passenger: passengerId,
      phase: "completed"
    }).session(session);

    // If count is 0, it means THIS is the first trip being completed (since this runs before the final save in some flows or just as it completes)
    // Actually, to be safe, we check if it's <= 1 depending on where we call it.
    // If we call it AFTER saving trip as completed, count will be 1.
    if (completedTripsCount > 1) return;

    const config = await SystemConfig.findOne().session(session).lean();
    const bonusAmount = config?.referralBonusAmount || 50; // Default 50 if not set

    if (bonusAmount <= 0) return;

    const referrerId = passenger.referredBy;
    const { newBalance } = await createUserWalletTx(session, {
      userId: referrerId,
      type: "credit",
      amount: bonusAmount,
      reference: "referral",
      referenceId: tripId,
      description: `Referral reward for ${passenger.name}'s first trip`,
    });

    notifyUser({
      userId: referrerId,
      title: "🎁 Referral Reward!",
      message: `You earned ₹${bonusAmount} because ${passenger.name} completed their first ride! New balance: ₹${newBalance}`,
      type: "success"
    }).catch(() => { });

  } catch (error) {
    console.error("Referral Reward Error:", error);
    // Don't throw, we don't want to break the trip completion if reward fails
  }
};
const processTripSplit = async ({ amountRupees, tripId, passengerId, driverId, method, razorpayPaymentId = "" }) => {
  const commissionRate = await getCommissionRate();
  const platformCut = Math.round(amountRupees * commissionRate * 100) / 100;
  const driverEarning = Math.round((amountRupees - platformCut) * 100) / 100;
  const platformAccountId = process.env.PLATFORM_ACCOUNT_ID;
  if (!platformAccountId) throw new Error("PLATFORM_ACCOUNT_ID not set in env");

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const trip = await TripModel.findById(tripId).session(session);
    if (!trip) throw new Error("Trip not found");

    if (trip.phase === "completed" && trip.payment) {
      // Idempotency: Already processed
      const existingPayment = await PaymentModel.findById(trip.payment).lean();
      await session.abortTransaction();
      session.endSession();
      return {
        platformCut: existingPayment?.platformFee || platformCut,
        driverEarning: existingPayment?.driverEarnings || driverEarning,
        paymentId: trip.payment
      };
    }

    let passengerTx = null;

    if (method === "wallet") {
      // Wallet payment: debit passenger
      const pax = await UserModel.findById(passengerId).session(session);
      if (!pax) throw new Error("Passenger not found");
      if ((pax.walletBalance || 0) < amountRupees)
        throw new Error(`Insufficient wallet balance. Need ₹${amountRupees}, have ₹${pax.walletBalance || 0}`);
      const { tx } = await createUserWalletTx(session, {
        userId: passengerId, type: "debit", amount: amountRupees,
        reference: "trip", referenceId: tripId,
        description: "Wallet trip payment",
        commissionAmount: platformCut, driverEarning,
      });
      passengerTx = tx;
    } else if (method === "upi") {
      // UPI payment: informational record for passenger history
      const { tx } = await createUserWalletTx(session, {
        userId: passengerId, type: "debit", amount: amountRupees,
        reference: "trip", referenceId: tripId,
        description: `Trip payment via UPI — #${razorpayPaymentId}`,
        affectsBalance: false,
      });
      passengerTx = tx;
    }

    // Credit driver earnings wallet
    const { tx: driverTx } = await createDriverEarningsTx(session, {
      driverUserId: driverId, type: "credit", amount: driverEarning,
      reference: "trip", referenceId: tripId,
      description: `Trip earning ${Math.round((1 - commissionRate) * 100)}%`,
    });

    // Credit platform/superadmin wallet
    const { tx: platformTx } = await createUserWalletTx(session, {
      userId: platformAccountId, type: "credit", amount: platformCut,
      reference: "trip", referenceId: tripId,
      description: `Platform commission ${Math.round(commissionRate * 100)}%`,
      commissionAmount: platformCut, driverEarning,
    });

    // Upsert Payment record
    const paymentDoc = await PaymentModel.findOneAndUpdate(
      { trip: tripId },
      {
        trip: tripId, passenger: passengerId, driver: driverId,
        amount: amountRupees, platformFee: platformCut, driverEarnings: driverEarning,
        method, status: "completed",
        ...(passengerTx && { passengerWalletTx: passengerTx._id }),
        driverWalletTx: driverTx._id,
        platformWalletTx: platformTx._id,
        razorpayPaymentId,
        paidAt: new Date(),
      },
      { upsert: true, new: true, session }
    );

    trip.payment = paymentDoc._id;
    trip.phase = "completed";
    trip.completedAt = new Date();
    await trip.save({ session });

    // Also update PublishedRide status if applicable
    if (trip.publishedRide) {
      await PublishedRideModel.findByIdAndUpdate(trip.publishedRide, { status: "completed" }, { session });
    }

    // ── Check for Referral Reward ──
    await checkAndRewardReferrer(session, passengerId, tripId);

    await session.commitTransaction();
    session.endSession();

    // Fire-and-forget notifications
    notifyUser({ userId: driverId, title: "💰 Trip Earning Credited", message: `₹${driverEarning} added to earnings wallet.`, type: "success" }).catch(() => { });
    if (method === "wallet") {
      notifyUser({ userId: passengerId, title: "✅ Wallet Payment Done", message: `₹${amountRupees} paid from wallet.`, type: "info" }).catch(() => { });
    }

      // Notify clients on the socket room that payment is complete
      const io = getIO();
      const rideRoom = trip.publishedRide?.toString() || tripId.toString();
      const payload = { method, tripId: tripId.toString(), rideId: trip.publishedRide?.toString() };

      // Emit to ride room (catches anyone in the ride)
      io.to(rideRoom).emit("payment_completed", payload);
      // Emit to specific trip room
      io.to(tripId.toString()).emit("payment_completed", payload);
      // Emit to personal user rooms (catches reconnected clients)
      if (passengerId) io.to(passengerId.toString()).emit("payment_completed", payload);
      if (driverId) io.to(driverId.toString()).emit("payment_completed", payload);

    return { platformCut, driverEarning, paymentId: paymentDoc._id, tripId: tripId.toString() };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ─── POST /api/payments/create-order ─────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { amount, purpose, tripId, rideId } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: "Invalid amount" });
    if (!purpose) return res.status(400).json({ success: false, message: "Purpose required" });

    const notes = { purpose, userId: req.user.id.toString() };

    if (purpose === "upi_trip") {
      if (!tripId && !rideId) return res.status(400).json({ success: false, message: "tripId or rideId required" });
      let trip;
      if (tripId) trip = await TripModel.findById(tripId).lean();
      else trip = await TripModel.findOne({ publishedRide: rideId, passenger: req.user.id }).lean();

      if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
      notes.tripId = trip._id.toString();
      notes.passengerId = trip.passenger.toString();
      notes.driverId = trip.driver?.toString() || "";
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rm_${Date.now()}`,
      notes,
    });

    return res.status(200).json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency, notes: order.notes },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
};

// ─── POST /api/payments/verify-payment ────────────────────────────────────────
// Called directly by frontend after Razorpay checkout succeeds.
// Works in both dev (no public URL) and production environments.
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purpose, userId, tripId, passengerId, driverId } = req.body;

    // 1. Verify HMAC signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // 2. Fetch payment details from Razorpay to get amount and notes
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    const amountRupees = paymentDetails.amount / 100;
    const notes = paymentDetails.notes || {};

    // Robust extraction of IDs, falling back to Razorpay notes if frontend missed them
    const finalUserId = userId || req.user?._id?.toString() || req.user?.id || notes.userId;
    const actualTripId = tripId || notes.tripId;
    const actualPassengerId = passengerId || notes.passengerId || finalUserId;
    const actualDriverId = driverId || notes.driverId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (purpose === "wallet_topup") {
        const desc = `Wallet topup via Razorpay #${razorpay_payment_id}`;
        const existingTx = await WalletTransaction.findOne({ description: desc });
        if (existingTx) {
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ success: true, message: "Already processed" });
        }

        // ── Credit passenger wallet ──
        const { newBalance } = await createUserWalletTx(session, {
          userId: finalUserId,
          type: "credit",
          amount: amountRupees,
          reference: "topup",
          description: desc,
          affectsBalance: true,
        });
        await session.commitTransaction();
        session.endSession();

        notifyUser({ userId: finalUserId, title: "💰 Wallet Credited", message: `₹${amountRupees} added to your wallet. Balance: ₹${newBalance}`, type: "success" }).catch(() => { });
        return res.status(200).json({ success: true, message: "Wallet topup successful", newBalance });

      } else if (purpose === "commission_topup") {
        const desc = `Commission wallet topup #${razorpay_payment_id}`;
        const existingTx = await WalletTransaction.findOne({ description: desc });
        if (existingTx) {
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ success: true, message: "Already processed" });
        }

        // ── Credit driver commission wallet ──
        const { newBalance } = await updateCommissionWallet(session, {
          driverUserId: finalUserId,
          delta: amountRupees,
          reference: "topup",
          description: desc,
        });
        await session.commitTransaction();
        session.endSession();

        notifyUser({ userId: finalUserId, title: "✅ Commission Wallet Topped Up", message: `₹${amountRupees} credited. Balance: ₹${newBalance}`, type: "success" }).catch(() => { });
        return res.status(200).json({ success: true, message: "Commission wallet topup successful", newBalance });

      } else if (purpose === "upi_trip") {
        // ── UPI Trip Payment: credit driver + platform, log info tx for passenger ──
        const result = await processTripSplit({
          amountRupees,
          tripId: actualTripId,
          passengerId: actualPassengerId,
          driverId: actualDriverId,
          method: "upi",
          razorpayPaymentId: razorpay_payment_id,
        });
        return res.status(200).json({ success: true, message: "UPI trip payment verified", ...result });

      } else {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `Unknown payment purpose: ${purpose}` });
      }
    } catch (innerErr) {
      await session.abortTransaction();
      session.endSession();
      throw innerErr;
    }
  } catch (err) {
    console.error("[Payment] verifyPayment:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/webhook/razorpay (Registered in server.js) ─────────────────────
export const razorpayWebhook = async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 📥 RAZORPAY WEBHOOK RECEIVED`);

  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body; // Buffer

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error(`[${timestamp}] ❌ ERROR: RAZORPAY_WEBHOOK_SECRET is not set in your .env file!`);
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    // 1. Verify HMAC Signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.error(`[${timestamp}] ❌ SIGNATURE MISMATCH!`);
      console.log(`Received: ${signature?.substring(0, 10)}...`);
      console.log(`Expected: ${expected.substring(0, 10)}...`);
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // 2. Parse payload
    const event = JSON.parse(rawBody.toString());
    console.log(`[${timestamp}] ✅ SIGNATURE VERIFIED. Event Type: ${event.event}`);

    if (event.event !== "payment.captured") {
      console.log(`[${timestamp}] ℹ️ Ignoring non-captured event: ${event.event}`);
      return res.status(200).json({ received: true });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      console.error(`[${timestamp}] ❌ No payment entity found in payload`);
      return res.status(400).json({ success: false, message: "No payment entity" });
    }

    const notes = payment.notes || {};
    console.log(`[${timestamp}] 📝 Notes Received:`, JSON.stringify(notes));

    const { purpose, paymentType, userId, tripId, passengerId, driverId } = notes;
    const finalPurpose = paymentType || purpose;
    const amountRupees = payment.amount / 100;

    if (!userId && !passengerId && !driverId) {
      console.error(`[${timestamp}] ❌ ERROR: No User ID found in payment notes. Cannot credit wallet.`);
      return res.status(200).json({ received: true, error: "Missing identity notes" });
    }

    console.log(`[${timestamp}] ⚙️ Processing ${finalPurpose} for ₹${amountRupees} (User: ${userId || passengerId || driverId})`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (finalPurpose === "wallet_topup") {
        const desc = `Wallet topup via Razorpay #${payment.id}`;
        const existingTx = await WalletTransaction.findOne({ description: desc });
        if (existingTx) {
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ received: true });
        }

        // (1) Passenger Wallet Topup
        const { newBalance } = await createUserWalletTx(session, {
          userId,
          type: "credit",
          amount: amountRupees,
          reference: "topup",
          description: desc,
        });
        await session.commitTransaction();
        notifyUser({ userId, title: "💰 Wallet Credited", message: `₹${amountRupees} added to your wallet. Balance: ₹${newBalance}`, type: "success" }).catch(() => { });
      }
      else if (finalPurpose === "commission_topup") {
        const desc = `Commission wallet topup #${payment.id}`;
        const existingTx = await WalletTransaction.findOne({ description: desc });
        if (existingTx) {
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ received: true });
        }

        // (2) Driver Commission Wallet Topup
        const { newBalance } = await updateCommissionWallet(session, {
          driverUserId: userId,
          delta: amountRupees,
          reference: "topup",
          description: desc,
        });
        await session.commitTransaction();

        // Check if driver is now unblocked
        const config = await SystemConfig.findOne().lean();
        const threshold = config?.commissionWalletMinThreshold ?? -150;

        notifyUser({ userId, title: "✅ Commission Wallet Topped Up", message: `₹${amountRupees} credited. Balance: ₹${newBalance}`, type: "success" }).catch(() => { });

        if (newBalance > threshold) {
          notifyUser({ userId, title: "🚗 Trips Resumed", message: "Your commission wallet is restored. You can now accept rides again.", type: "success" }).catch(() => { });
        }
      }
      else if (finalPurpose === "trip_payment" || finalPurpose === "upi_trip") {
        const tripDocCheck = await TripModel.findById(tripId).session(session);
        if (tripDocCheck && tripDocCheck.phase === "completed" && tripDocCheck.payment) {
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ received: true, message: "Already processed" });
        }

        // (3) Trip Payment Auto-Split (Dynamic Platform %, Remaining to Driver)
        const commissionRate = await getCommissionRate();
        const platformCut = Math.round(amountRupees * commissionRate * 100) / 100;
        const driverEarning = Math.round((amountRupees - platformCut) * 100) / 100;
        const platformId = process.env.PLATFORM_ACCOUNT_ID;

        if (!platformId) throw new Error("PLATFORM_ACCOUNT_ID not set in environment");

        // (A) Passenger Transaction Record (Informational Only - External UPI)
        // We log it for history, but it does NOT affect the internal wallet balance.
        await createUserWalletTx(session, {
          userId: passengerId || userId,
          type: "debit",
          amount: amountRupees,
          affectsBalance: false,
          reference: "trip",
          referenceId: tripId,
          description: `Trip payment via UPI — #${payment.id}`,
        });


        // ── B. Driver Earning (Dynamic) ──
        await createDriverEarningsTx(session, {
          driverUserId: driverId,
          type: "credit",
          amount: driverEarning,
          reference: "trip",
          referenceId: tripId,
          description: `Trip earning (${Math.round((1 - commissionRate) * 100)}%)`,
        });

        // ── C. Platform Income (Dynamic) ──
        await createUserWalletTx(session, {
          userId: platformId,
          type: "credit",
          amount: platformCut,
          reference: "trip",
          referenceId: tripId,
          description: `Platform commission (${Math.round(commissionRate * 100)}%)`,
          commissionAmount: platformCut,
          driverEarning,
        });

        // ── D. Update Trip & Create Payment Record ──
        const paymentDoc = await PaymentModel.findOneAndUpdate(
          { trip: tripId },
          {
            trip: tripId, passenger: passengerId, driver: driverId,
            amount: amountRupees, platformFee: platformCut, driverEarnings: driverEarning,
            method: "upi", status: "completed", razorpayPaymentId: payment.id, paidAt: new Date(),
          },
          { upsert: true, new: true, session }
        );
        await TripModel.findByIdAndUpdate(tripId, {
          payment: paymentDoc._id,
          phase: "completed",
          completedAt: new Date()
        }, { session });

        // Also update PublishedRide status
        const tripDoc = await TripModel.findById(tripId).session(session);
        if (tripDoc?.publishedRide) {
          await PublishedRideModel.findByIdAndUpdate(tripDoc.publishedRide, { status: "completed" }, { session });
        }

        // ── Check for Referral Reward ──
        await checkAndRewardReferrer(session, passengerId || userId, tripId);

        await session.commitTransaction();

        // ── E. Notifications ──
        notifyUser({ userId: driverId, title: "💰 Trip Payment Received", message: `₹${driverEarning} credited (${Math.round((1 - commissionRate) * 100)}%).`, type: "success" }).catch(() => { });
        notifyUser({ userId: passengerId, title: "✅ Payment Successful", message: `₹${amountRupees} paid for your trip.`, type: "info" }).catch(() => { });

        // Notify socket rooms
        try {
          const io = getIO();
          const tripDoc = await TripModel.findById(tripId).lean();
          const rideRoom = tripDoc?.publishedRide?.toString() || tripId;
          const payload = { method: "upi", tripId: tripId.toString(), rideId: tripDoc?.publishedRide?.toString() };

          // Emit to ride room, trip room, and personal user rooms for 100% reliability
          io.to(rideRoom).emit("payment_completed", payload);
          io.to(tripId.toString()).emit("payment_completed", payload);
          if (passengerId) io.to(passengerId.toString()).emit("payment_completed", payload);
          if (driverId) io.to(driverId.toString()).emit("payment_completed", payload);
        } catch (e) { console.error("UPI webhook socket emit error:", e); }
      }

      session.endSession();
      return res.status(200).json({ received: true });

    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      console.error("[Razorpay Webhook] ❌ Transaction Error:", innerError.message);
      throw innerError;
    }

  } catch (err) {
    console.error("[Razorpay Webhook] ❌ Webhook processing failed:", err.message);
    return res.status(200).json({ received: true, error: err.message });
  }
};

// ─── POST /api/payments/wallet-pay ───────────────────────────────────────────
export const walletPayment = async (req, res) => {
  try {
    const { tripId, rideId } = req.body;
    const passengerId = req.user.id;

    let trip;
    if (tripId) trip = await TripModel.findById(tripId).lean();
    else trip = await TripModel.findOne({ publishedRide: rideId, passenger: passengerId }).lean();

    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
    if (trip.passenger.toString() !== passengerId)
      return res.status(403).json({ success: false, message: "Not your trip" });

    // For standard rides, fare is on the trip document.
    // For published (carpooling) rides, fare lives on the booking's amountPaid in PublishedRide.
    let amount = trip.fare?.surgedTotal || trip.fare?.total || 0;

    if (!amount && trip.publishedRide) {
      // Fall back: look up the passenger's booking in the PublishedRide
      const pubRide = await PublishedRideModel.findById(trip.publishedRide).lean();
      const booking = pubRide?.bookings?.find(
        (b) => b.passenger?.toString() === passengerId
      );
      amount = booking?.amountPaid || 0;
    }

    if (!amount) return res.status(400).json({ success: false, message: "Fare amount not found on trip" });

    const result = await processTripSplit({
      amountRupees: amount,
      tripId: trip._id,
      passengerId,
      driverId: trip.driver?.toString(),
      method: "wallet",
    });

    return res.status(200).json({ success: true, message: "Wallet payment processed", ...result });
  } catch (err) {
    console.error("[Payment] walletPayment:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/payments/cash-received ────────────────────────────────────────
export const cashReceived = async (req, res) => {
  try {
    const { tripId, rideId } = req.body;
    const driverUserId = req.user.id;

    let trip;
    if (tripId) trip = await TripModel.findById(tripId).lean();
    else trip = await TripModel.findOne({ publishedRide: rideId, driver: driverUserId }).lean();

    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
    if (trip.driver?.toString() !== driverUserId)
      return res.status(403).json({ success: false, message: "Not your trip" });
    if (!["arrived", "ongoing", "reached_destination", "completed"].includes(trip.phase))
      return res.status(400).json({ success: false, message: "Trip is not in a payable phase" });

    if (trip.payment) {
      return res.status(400).json({ success: false, message: "Payment already recorded for this trip" });
    }

    const amount = trip.fare?.surgedTotal || trip.fare?.total || 0;
    const commissionRate = await getCommissionRate();
    const platformCut = Math.round(amount * commissionRate * 100) / 100;
    const driverNet = Math.round((amount - platformCut) * 100) / 100;
    const platformAccountId = process.env.PLATFORM_ACCOUNT_ID;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Deduct commissionWallet
      const { newBalance: commissionBalance } = await updateCommissionWallet(session, {
        driverUserId, delta: -platformCut,
        reference: "trip", referenceId: trip._id,
        description: `Platform commission ${Math.round(commissionRate * 100)}% — Cash trip`,
      });

      // Credit platform wallet
      const { tx: platformTx } = await createUserWalletTx(session, {
        userId: platformAccountId, type: "credit", amount: platformCut,
        reference: "trip", referenceId: trip._id,
        description: `Platform commission ${Math.round(commissionRate * 100)}% — Cash trip`,
        commissionAmount: platformCut, driverEarning: driverNet,
      });

      // Upsert Payment record
      const paymentDoc = await PaymentModel.findOneAndUpdate(
        { trip: trip._id },
        {
          trip: trip._id, passenger: trip.passenger, driver: driverUserId,
          amount, platformFee: platformCut, driverEarnings: driverNet,
          method: "cash", status: "completed", paidAt: new Date(),
          platformWalletTx: platformTx._id,
        },
        { upsert: true, new: true, session }
      );
      await TripModel.findByIdAndUpdate(trip._id, {
        payment: paymentDoc._id,
        phase: "completed",
        completedAt: new Date()
      }, { session });

      // Also update PublishedRide status
      if (trip.publishedRide) {
        await PublishedRideModel.findByIdAndUpdate(trip.publishedRide, { status: "completed" }, { session });
      }

      // ── Check for Referral Reward ──
      await checkAndRewardReferrer(session, trip.passenger, trip._id);

      await session.commitTransaction();
      session.endSession();

      const config = await SystemConfig.findOne().lean();
      const threshold = config?.commissionWalletMinThreshold ?? -150;
      const warning = config?.commissionWalletWarningLevel ?? -50;

      if (commissionBalance < threshold) {
        notifyUser({ userId: driverUserId, title: "🚫 Trips Blocked", message: `Commission wallet: ₹${commissionBalance}. Topup required to resume rides.`, type: "error" }).catch(() => { });
      } else if (commissionBalance < warning) {
        notifyUser({ userId: driverUserId, title: "⚠️ Low Commission Wallet", message: `Balance: ₹${commissionBalance}. Please topup soon.`, type: "warning" }).catch(() => { });
      } else {
        notifyUser({ userId: driverUserId, title: "✅ Cash Received Confirmed", message: `₹${platformCut} commission deducted. Net: ₹${driverNet}.`, type: "success" }).catch(() => { });
      }

      // Notify clients on the socket room that payment is complete
      try {
        const io = getIO();
        const rideRoom = trip.publishedRide?.toString() || trip._id.toString();
        const payload = { method: "cash", tripId: trip._id.toString(), rideId: trip.publishedRide?.toString() };

        // Emit to ride room (catches anyone in the ride)
        io.to(rideRoom).emit("payment_completed", payload);
        // Emit to specific trip room
        io.to(trip._id.toString()).emit("payment_completed", payload);
        // Emit to personal user rooms (catches reconnected clients)
        io.to(trip.passenger.toString()).emit("payment_completed", payload);
        io.to(driverUserId.toString()).emit("payment_completed", payload);
      } catch (e) {
        console.error("Socket error on payment emit", e);
      }

      return res.status(200).json({
        success: true,
        message: "Cash payment recorded",
        tripId: trip._id.toString(),
        commissionDeducted: platformCut,
        driverNet,
        commissionWalletBalance: commissionBalance,
        tripsBlocked: commissionBalance < threshold,
      });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  } catch (err) {
    console.error("[Payment] cashReceived:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/payments/driver-withdrawal ────────────────────────────────────
export const driverWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const driverUserId = req.user.id;

    const config = await SystemConfig.findOne().lean();
    const minAmount = config?.withdrawalMinAmount ?? 100;
    const reserveBal = config?.withdrawalReserveBalance ?? 50;
    const dailyMax = config?.withdrawalDailyMax ?? 50000;

    if (!amount || amount < minAmount)
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${minAmount}` });
    if (amount > dailyMax)
      return res.status(400).json({ success: false, message: `Maximum daily withdrawal is ₹${dailyMax}` });

    const profile = await DriverProfileModel.findOne({ user: driverUserId }).lean();
    if (!profile) return res.status(404).json({ success: false, message: "Driver profile not found" });

    const walletBalance = profile.walletBalance || 0;
    const maxWithdrawable = walletBalance - reserveBal;
    if (maxWithdrawable < amount)
      return res.status(400).json({
        success: false,
        message: `Insufficient. Must keep ₹${reserveBal} reserve. Available: ₹${Math.max(0, maxWithdrawable)}`,
      });

    // TEST: simulate payout
    const simulatedPayoutId = `pout_test_${Date.now()}`;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { newBalance } = await createDriverEarningsTx(session, {
        driverUserId, type: "debit", amount,
        reference: "withdrawal",
        description: `Bank withdrawal — ${simulatedPayoutId}`,
      });
      await session.commitTransaction();
      session.endSession();

      notifyUser({
        userId: driverUserId,
        title: "✅ Withdrawal Processed",
        message: `₹${amount} transfer initiated. Remaining wallet: ₹${newBalance}.`,
        type: "success",
      }).catch(() => { });

      return res.status(200).json({
        success: true,
        message: "Withdrawal processed",
        amount,
        newWalletBalance: newBalance,
        payoutId: simulatedPayoutId,
        mode: "IMPS",
      });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  } catch (err) {
    console.error("[Payment] driverWithdrawal:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET /api/payments/my-wallet ─────────────────────────────────────────────
export const getMyWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const user = await UserModel.findById(userId).select("walletBalance role name referralCode referredBy").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const transactions = await WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const aggregates = await WalletTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "credit"] }, { $eq: ["$reference", "trip"] }] }, "$amount", 0] } },
          totalWithdrawn: { $sum: { $cond: [{ $eq: ["$reference", "withdrawal"] }, "$amount", 0] } },
          totalCommissionPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "debit"] }, { $eq: ["$reference", "trip"] }] }, "$amount", 0] } },
          totalTopups: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "credit"] }, { $eq: ["$reference", "topup"] }] }, "$amount", 0] } },
        }
      }
    ]);
    let stats = aggregates[0] || { totalEarned: 0, totalWithdrawn: 0, totalCommissionPaid: 0 };
    let cashCommissionDebt = stats.totalCommissionPaid; // This is specifically the cash commission paid from the wallet

    let driverWallets = null;
    if (role === "driver") {
      // Get the absolute true lifetime totals for the driver from the Payment records directly
      const paymentAggregates = await PaymentModel.aggregate([
        { $match: { driver: new mongoose.Types.ObjectId(userId), status: "completed" } },
        {
          $group: {
            _id: null,
            trueTotalEarned: { $sum: "$driverEarnings" },
            trueTotalCommissionPaid: { $sum: "$platformFee" }
          }
        }
      ]);

      if (paymentAggregates.length > 0) {
        stats.totalEarned = paymentAggregates[0].trueTotalEarned || 0;
        // NOT overriding stats.totalCommissionPaid, because the driver ONLY wants to see cash commission debt
      }
      let profile = await DriverProfileModel.findOne({ user: userId })
        .select("walletBalance commissionWallet").lean();

      // PERFECT SYNC: 100 Rs starting bonus + total topups - ONLY the commission paid via cash deductions
      const dynamicCommissionWallet = 100 + (stats.totalTopups || 0) - (cashCommissionDebt || 0);

      if (profile && profile.commissionWallet !== dynamicCommissionWallet) {
        await DriverProfileModel.updateOne(
          { user: userId },
          { $set: { commissionWallet: dynamicCommissionWallet } }
        );
      }

      driverWallets = {
        walletBalance: profile?.walletBalance ?? 0,
        commissionWallet: dynamicCommissionWallet,
      };
    }

    const config = await SystemConfig.findOne().lean();
    const threshold = config?.commissionWalletMinThreshold ?? -150;
    const warning = config?.commissionWalletWarningLevel ?? -50;

    return res.status(200).json({
      success: true,
      wallet: {
        walletBalance: user.walletBalance ?? 0,
        ...(driverWallets ?? {}),
        tripsBlocked: role === "driver" ? (driverWallets?.commissionWallet ?? 0) < threshold : false,
        commissionWarning: role === "driver" ? (driverWallets?.commissionWallet ?? 0) < warning : false,
      },
      stats,
      transactions,
      config: {
        commissionWalletMinThreshold: threshold,
        commissionWalletWarningLevel: warning,
        commission: config?.commission || "15",
        withdrawalMinAmount: config?.withdrawalMinAmount ?? 100,
        withdrawalReserveBalance: config?.withdrawalReserveBalance ?? 50,
        withdrawalDailyMax: config?.withdrawalDailyMax ?? 50000,
      },
    });
  } catch (err) {
    console.error("[Payment] getMyWallet:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load wallet data" });
  }
};

// ─── POST /api/payments/admin-credit ─────────────────────────────────────────
// Admin manually credits a passenger wallet (dispute / support)
export const adminCredit = async (req, res) => {
  try {
    const { targetUserId, amount, description } = req.body;
    if (!targetUserId || !amount || amount <= 0)
      return res.status(400).json({ success: false, message: "targetUserId and amount required" });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { newBalance } = await createUserWalletTx(session, {
        userId: targetUserId, type: "credit", amount,
        reference: "refund",
        description: description || "Support team credit",
      });
      await session.commitTransaction();
      session.endSession();

      notifyUser({ userId: targetUserId, title: "💰 Wallet Credit", message: `₹${amount} credited by support team. Balance: ₹${newBalance}`, type: "success" }).catch(() => { });

      return res.status(200).json({ success: true, message: "Credit applied", newBalance });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  } catch (err) {
    console.error("[Payment] adminCredit:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
