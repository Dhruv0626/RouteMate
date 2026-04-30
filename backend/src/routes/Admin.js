import express from "express";
import { GetDashboardStats, GetSystemHealth, GetAuditLogs, GetRevenueStats } from "../controllers/AdminController.js";
import { GetSettings, UpdateSettings } from "../controllers/SystemSettingsController.js";
import authMiddleware from "../middlewares/AuthMid.js";
import { isAdmin, isSuperAdmin } from "../middlewares/RoleMid.js";

const router = express.Router();

/**
 * 🔐 These routes require JWT and Admin/SuperAdmin role
 * /api/admin/*
 */

// Core dashboard and analytics stats
router.get("/dashboard-stats", authMiddleware, isAdmin, GetDashboardStats);

// System health and Audit logs
router.get("/system-health", authMiddleware, isAdmin, GetSystemHealth);
router.get("/audit-logs", authMiddleware, isAdmin, GetAuditLogs);
router.get("/revenue-stats", authMiddleware, isSuperAdmin, GetRevenueStats);

// System configuration management
router.get("/system-settings", authMiddleware, isAdmin, GetSettings);
router.patch("/system-settings", authMiddleware, isAdmin, UpdateSettings);

// Specialized financial system configuration
router.get("/system-config", authMiddleware, isAdmin, GetSettings);
router.put("/system-config", authMiddleware, isSuperAdmin, UpdateSettings);

export default router;
