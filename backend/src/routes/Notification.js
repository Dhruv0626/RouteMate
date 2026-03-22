import express from "express";
import {
    GetMyNotifications,
    MarkAsRead,
    MarkAllAsRead,
    DeleteNotification
} from "../controllers/NotificationController.js";
import authMiddleware from "../middlewares/AuthMid.js";

const router = express.Router();

// ─── Protected Routes (JWT required) ───────────────────────────────────────────

// Fetch user's notification list
router.get("/", authMiddleware, GetMyNotifications);

// Mark a specific notification as read
router.patch("/:id/read", authMiddleware, MarkAsRead);

// Mark all notifications as read
router.patch("/read-all", authMiddleware, MarkAllAsRead);

// Delete a notification
router.delete("/:id", authMiddleware, DeleteNotification);

export default router;
