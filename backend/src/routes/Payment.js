import express from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  walletPayment,
  cashReceived,
  driverWithdrawal,
  getMyWallet,
  adminCredit,
} from "../controllers/PaymentController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

// ─── Protected routes ─────────────────────────────────────────────────────────

// Create Razorpay order (passenger topup / driver commission topup / UPI trip)
router.post("/create-order", authMiddleware, createOrder);

// Verify payment directly (works without webhook — required for local dev)
router.post("/verify-payment", authMiddleware, verifyPayment);

// Passenger pays trip with wallet balance
router.post("/wallet-pay", authMiddleware, authorizeRoles("passenger"), walletPayment);

// Driver marks cash received → commissionWallet deducted
router.post("/cash-received", authMiddleware, authorizeRoles("driver"), cashReceived);

// Driver requests bank withdrawal (TEST: simulated)
router.post("/driver-withdrawal", authMiddleware, authorizeRoles("driver"), driverWithdrawal);

// Get wallet info + transaction history (any authenticated user)
router.get("/my-wallet", authMiddleware, getMyWallet);

// Admin manually credits a passenger wallet
router.post("/admin-credit", authMiddleware, authorizeRoles("admin", "superadmin"), adminCredit);

export default router;
