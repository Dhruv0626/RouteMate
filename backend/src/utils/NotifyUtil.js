import NotificationModel from "../models/NotificationModel.js";
import UserModel from "../models/UserModel.js";

/**
 * Notifies all users with a specific role
 * @param {string} role - Target role (e.g. 'admin', 'driver')
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} senderId - ID of user who triggered the action
 * @param {string} type - Notification type from enum
 * @param {string} link - Optional link
 * @param {object} metadata - Extra context data
 */
export const notifyRole = async ({ role, title, message, senderId, type = "notification", link = null, metadata = {} }) => {
    try {
        const recipients = await UserModel.find({ role }).select("_id");
        
        if (recipients.length === 0) return;

        const notifications = recipients.map(user => ({
            recipient: user._id,
            sender: senderId,
            title,
            message,
            type,
            link,
            metadata
        }));

        await NotificationModel.insertMany(notifications);
    } catch (error) {
        console.error(`Error notifying all ${role}s:`, error);
    }
};

/**
 * Specifically notify ALL admins about an action
 */
export const notifyAdmins = (params) => notifyRole({ ...params, role: "admin" });

/**
 * Specifically notify ALL drivers about a price change or other updates
 */
export const notifyDrivers = (params) => notifyRole({ ...params, role: "driver" });
