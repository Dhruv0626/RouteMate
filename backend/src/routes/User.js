import express from "express";
import {
    CreateUser,
    SignInUser,
    RefreshToken,
    LogoutUser,
    GetProfile,
    DeleteUser,
    GetAllUsers,
    UpdateUser
} from "../controllers/UserController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";
import { authLimiter } from "../middlewares/RateLimiter.js";
import { validateRegister, validateSignIn } from "../middlewares/ValidateMid.js";

const router = express.Router();

// ─── Public Routes (with auth rate limiter + input validation) ────────────────
router.post("/register", authLimiter, validateRegister, CreateUser);
router.post("/signin", authLimiter, validateSignIn, SignInUser);

// ─── Token Management ─────────────────────────────────────────────────────────
router.post("/refresh-token", RefreshToken);
router.post("/logout", authMiddleware, LogoutUser);

// ─── Protected Routes (JWT required) ─────────────────────────────────────────
router.get("/profile", authMiddleware, GetProfile);

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