import express from "express";
import { GetDashboardStats, GetSystemHealth, GetAuditLogs } from "../controllers/AdminController.js";
import { GetSettings, UpdateSettings } from "../controllers/SystemSettingsController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import authorizeRoles from "../middlewares/RoleMid.js";

const router = express.Router();

/**
 * 🔐 These routes require JWT and "admin" role
 * /api/admin/*
 */

// Core dashboard and analytics stats
router.get("/dashboard-stats", authMiddleware, authorizeRoles("admin"), GetDashboardStats);

// System health and Audit logs
router.get("/system-health", authMiddleware, authorizeRoles("admin"), GetSystemHealth);
router.get("/audit-logs", authMiddleware, authorizeRoles("admin"), GetAuditLogs);

// System configuration management
router.get("/system-settings", authMiddleware, authorizeRoles("admin"), GetSettings);
router.patch("/system-settings", authMiddleware, authorizeRoles("admin"), UpdateSettings);

export default router;
