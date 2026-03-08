import express from "express";
import { GetDashboardStats, GetSystemHealth } from "../controllers/AdminController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

/**
 * 🔐 These routes require JWT and "admin" role
 * /api/admin/*
 */

// Core dashboard and analytics stats
router.get("/dashboard-stats", authMiddleware, authorizeRoles("admin"), GetDashboardStats);

// System health (Security/System pages)
router.get("/system-health", authMiddleware, authorizeRoles("admin"), GetSystemHealth);

export default router;
