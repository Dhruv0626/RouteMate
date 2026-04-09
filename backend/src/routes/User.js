import express from "express";
import {
    CreateUser,
    SignInUser,
    RefreshToken,
    LogoutUser,
    GetProfile,
    DeleteUser,
    DeleteUserForSelf,
    GetAllUsers,
    UpdateUser,
    VerifyEmailOTP,
    ResendVerificationOTP,
    FinalizeOAuthRegistration,
    UpdateMobileNumber,
    UpdateProfileImage,
    updateFCMToken
} from "../controllers/UserController.js";
import { GetSettings } from "../controllers/SystemSettingsController.js";
import { ForgotPassword, ResetPassword } from "../controllers/PasswordController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";
import { authLimiter } from "../middlewares/RateLimiter.js";
import { validateRegister, validateSignIn } from "../middlewares/ValidateMid.js";
import passport, { issueOAuthTokens } from "../config/passport.js";

const router = express.Router();
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// ─── Public Routes (with auth rate limiter + input validation) ────────────────
router.post("/register", authLimiter, validateRegister, CreateUser);
router.post("/signin", authLimiter, validateSignIn, SignInUser);
router.post("/verify-otp", authLimiter, VerifyEmailOTP);
router.post("/resend-otp", authLimiter, ResendVerificationOTP);
router.post("/finalize-oauth", authLimiter, FinalizeOAuthRegistration);
router.post("/update-mobile", authMiddleware, UpdateMobileNumber);

// ─── Token Management ─────────────────────────────────────────────────────────
router.post("/refresh-token", RefreshToken);
router.post("/logout", authMiddleware, LogoutUser);

// ─── Password Management ──────────────────────────────────────────────────────
router.post("/forgot-password", authLimiter, ForgotPassword);
router.post("/reset-password", authLimiter, ResetPassword);

// ─── OAuth Routes (Google & Facebook) ─────────────────────────────────────────
router.get(
    "/auth/google",
    (req, res, next) => {
        // Pass the requested role in state so the callback knows what type of account to create
        const role = req.query.role || "passenger";
        passport.authenticate("google", { scope: ["profile", "email"], state: role })(req, res, next);
    }
);

router.get(
    "/auth/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, async (err, user, info) => {
            if (err) return res.redirect(`${FRONTEND_URL}/signin?error=oauth_failed`);

            if (!user && info?.message?.startsWith("role_mismatch")) {
                const [, existingRole, requestedRole] = info.message.split(":");
                return res.redirect(`${FRONTEND_URL}/signin?error=role_mismatch&existing=${existingRole}&requested=${requestedRole}`);
            }

            if (!user) return res.redirect(`${FRONTEND_URL}/signin?error=oauth_failed`);

            await issueOAuthTokens(user, res);

            // Check if profile completion is needed
            const redirectPath = (!user.Mobile_no || user.Mobile_no === "0000000000")
                ? "/complete-profile"
                : `/${user.role}/dashboard`;

            res.redirect(`${FRONTEND_URL}${redirectPath}`);
        })(req, res, next);
    }
);

router.get("/auth/facebook", (req, res, next) => {
    const role = req.query.role || "passenger";
    passport.authenticate("facebook", { scope: ["email"], state: role })(req, res, next);
});

router.get(
    "/auth/facebook/callback",
    (req, res, next) => {
        passport.authenticate("facebook", { session: false }, async (err, user, info) => {
            if (err) return res.redirect(`${FRONTEND_URL}/signin?error=oauth_failed`);

            if (!user && info?.message?.startsWith("role_mismatch")) {
                const [, existingRole, requestedRole] = info.message.split(":");
                return res.redirect(`${FRONTEND_URL}/signin?error=role_mismatch&existing=${existingRole}&requested=${requestedRole}`);
            }

            if (!user) return res.redirect(`${FRONTEND_URL}/signin?error=oauth_failed`);

            await issueOAuthTokens(user, res);

            // Check if profile completion is needed
            const redirectPath = (!user.Mobile_no || user.Mobile_no === "0000000000")
                ? "/complete-profile"
                : `/${user.role}/dashboard`;

            res.redirect(`${FRONTEND_URL}${redirectPath}`);
        })(req, res, next);
    }
);

// ─── Protected Routes (JWT required) ─────────────────────────────────────────
router.get("/profile", authMiddleware, GetProfile);
router.post("/update-profile-image", authMiddleware, UpdateProfileImage);
router.post("/update-fcm-token", authMiddleware, updateFCMToken);
router.delete("/delete-account", authMiddleware, DeleteUserForSelf);

// ─── System Settings (Read-only for all authenticated users) ─────────────────
router.get("/system-settings", authMiddleware, GetSettings);

// ─── Admin-Only Routes ────────────────────────────────────────────────────────
// Get all non-admin users
router.get("/all", authMiddleware, authorizeRoles("admin"), GetAllUsers);

// Update a user by ID
router.put("/:userId", authMiddleware, authorizeRoles("admin"), UpdateUser);

// Delete a user by ID — deleted user will be automatically logged out on their browser
router.delete("/:userId", authMiddleware, authorizeRoles("admin"), DeleteUser);

// ─── RBAC Example Routes ──────────────────────────────────────────────────────
// Admin only
router.get("/admin-dashboard", authMiddleware, authorizeRoles("admin"), (req, res) => {
    res.json({ success: true, message: `Welcome Admin ${req.user.name}!` });
});

// Admin + Driver
router.get("/driver-panel", authMiddleware, authorizeRoles("admin", "driver"), (req, res) => {
    res.json({ success: true, message: `Welcome ${req.user.role} ${req.user.name}!` });
});

export default router;