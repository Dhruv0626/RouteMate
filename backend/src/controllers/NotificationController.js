import NotificationModel from "../models/Notification.js";

/**
 * Get all notifications for the authenticated user
 */
export const GetMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, unreadOnly = "false" } = req.query;

        const filter = { recipient: userId };
        if (unreadOnly === "true") {
            filter.isRead = false;
        }

        const notifications = await NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const unreadCount = await NotificationModel.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Mark a specific notification as read
 */
export const MarkAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await NotificationModel.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Mark all notifications for current user as read
 */
export const MarkAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await NotificationModel.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Delete a specific notification
 */
export const DeleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await NotificationModel.findOneAndDelete({ _id: id, recipient: userId });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Helper function to create a notification (Server-side use)
 */
export const createNotification = async (data) => {
    try {
        const notification = await NotificationModel.create(data);
        return notification;
    } catch (error) {
        console.error("Create Notification Helper Error:", error);
        return null;
    }
};
