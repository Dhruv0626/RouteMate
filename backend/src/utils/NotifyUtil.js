import NotificationModel from "../models/NotificationModel.js";
import UserModel from "../models/UserModel.js";

// ─── Core Primitives ──────────────────────────────────────────────────────────

/**
 * Notify a SINGLE user by their ID
 */
export const notifyUser = async ({ userId, title, message, senderId = null, type = "info", link = null, metadata = {} }) => {
    try {
        await NotificationModel.create({ recipient: userId, sender: senderId, title, message, type, link, metadata });
    } catch (error) {
        console.error(`[NotifyUtil] Error notifying user ${userId}:`, error.message);
    }
};

/**
 * Notify ALL users with a specific role (admin, driver, passenger)
 */
export const notifyRole = async ({ role, title, message, senderId = null, type = "info", link = null, metadata = {} }) => {
    try {
        const recipients = await UserModel.find({ role, isBlocked: false }).select("_id");
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
        console.error(`[NotifyUtil] Error notifying all ${role}s:`, error.message);
    }
};

// ─── Role Shortcuts ───────────────────────────────────────────────────────────

/** Notify ALL admins */
export const notifyAdmins = (params) => notifyRole({ ...params, role: "admin" });

/** Notify ALL drivers */
export const notifyDrivers = (params) => notifyRole({ ...params, role: "driver" });

/** Notify ALL passengers */
export const notifyPassengers = (params) => notifyRole({ ...params, role: "passenger" });

// ─── Smart Admin Action Notifier ──────────────────────────────────────────────
/**
 * Used when an ADMIN performs an action on a user or the system.
 * - Always notifies all admins
 * - If a target user is specified (and they are not an admin), also notifies that specific user
 */
export const notifyAdminAction = async ({
    targetUserId = null,
    targetRole = null,
    title,
    message,
    adminMessage = null,
    senderId = null,
    type = "info",
    link = null,
    adminLink = null,
    metadata = {}
}) => {
    // 1. Always notify all admins
    await notifyAdmins({
        title,
        message: adminMessage || message,
        senderId,
        type,
        link: adminLink || link,
        metadata
    });

    // 2. If there is a specific target user who is not an admin, notify them too
    if (targetUserId && targetRole !== "admin") {
        await notifyUser({
            userId: targetUserId,
            title,
            message,
            senderId,
            type,
            link,
            metadata
        });
    }
};

// ─── Specific Event Notification Functions ────────────────────────────────────

/**
 * EVENT: Admin blocked a user (passenger or driver)
 */
export const notifyUserBlocked = async ({ targetUser, adminId }) => {
    const isDriver = targetUser.role === "driver";
    await notifyUser({
        userId: targetUser._id,
        title: "Your Account Has Been Suspended",
        message: `Your RouteMate ${isDriver ? "driver" : "passenger"} account has been suspended by an administrator. If you believe this is a mistake, please contact our support team.`,
        senderId: adminId,
        type: "error",
        link: null,
        metadata: { action: "blocked" }
    });
    await notifyAdmins({
        title: "User Account Suspended",
        message: `Admin action: The account of ${targetUser.name} (${targetUser.role}) has been suspended.`,
        senderId: adminId,
        type: "warning",
        link: "/admin/dashboard/manage-users",
        metadata: { targetUserId: targetUser._id, action: "blocked" }
    });
};

/**
 * EVENT: Admin unblocked a user
 */
export const notifyUserUnblocked = async ({ targetUser, adminId }) => {
    const isDriver = targetUser.role === "driver";
    await notifyUser({
        userId: targetUser._id,
        title: "Your Account Has Been Restored",
        message: `Great news! Your RouteMate ${isDriver ? "driver" : "passenger"} account has been reinstated. You can now access your dashboard normally.`,
        senderId: adminId,
        type: "success",
        link: `/${targetUser.role}/dashboard`,
        metadata: { action: "unblocked" }
    });
    await notifyAdmins({
        title: "User Account Restored",
        message: `Admin action: The account of ${targetUser.name} (${targetUser.role}) has been reinstated.`,
        senderId: adminId,
        type: "success",
        link: "/admin/dashboard/manage-users",
        metadata: { targetUserId: targetUser._id, action: "unblocked" }
    });
};

/**
 * EVENT: Admin deleted a user
 */
export const notifyUserDeleted = async ({ targetUser, adminId }) => {
    await notifyAdmins({
        title: "User Account Permanently Deleted",
        message: `Admin action: The account of ${targetUser.name} (${targetUser.role}) has been permanently deleted from the platform.`,
        senderId: adminId,
        type: "error",
        link: "/admin/dashboard/manage-users",
        metadata: { targetUserId: targetUser._id, action: "deleted" }
    });
};

/**
 * EVENT: Driver submitted profile for review
 */
export const notifyDriverProfileSubmitted = async ({ driver, profileId, adminId }) => {
    // Notify all admins
    await notifyAdmins({
        title: "New Driver Application Received",
        message: `${driver.name} has submitted a new driver profile for review. Documents are ready for your inspection.`,
        senderId: driver._id,
        type: "info",
        link: "/admin/dashboard/driver-approvals",
        metadata: { driverId: driver._id, profileId }
    });
    // Confirm to the driver
    await notifyUser({
        userId: driver._id,
        title: "Application Submitted Successfully",
        message: "Your driver profile and documents have been submitted. Our team will review and respond within 1-2 business days.",
        senderId: adminId,
        type: "success",
        link: "/driver/dashboard",
        metadata: { profileId }
    });
};

/**
 * EVENT: Admin approved a driver profile
 */
export const notifyDriverApproved = async ({ driver, adminId, profileId }) => {
    await notifyUser({
        userId: driver._id,
        title: "🎉 Driver Profile Approved!",
        message: "Congratulations! Your driver profile has been verified and approved. You can now go online and start accepting rides.",
        senderId: adminId,
        type: "success",
        link: "/driver/dashboard/go-online",
        metadata: { profileId, action: "approved" }
    });
    await notifyAdmins({
        title: "Driver Profile Approved",
        message: `Admin action: The driver profile of ${driver.name} has been approved. They can now accept rides.`,
        senderId: adminId,
        type: "success",
        link: "/admin/dashboard/driver-approvals",
        metadata: { driverId: driver._id, profileId }
    });
};

/**
 * EVENT: Admin rejected a driver profile
 */
export const notifyDriverRejected = async ({ driver, adminId, profileId }) => {
    await notifyUser({
        userId: driver._id,
        title: "Driver Profile Requires Attention",
        message: "Your driver profile application has been reviewed and needs updates. Please re-check your documents and resubmit your profile form.",
        senderId: adminId,
        type: "error",
        link: "/driver/dashboard/profile-form",
        metadata: { profileId, action: "rejected" }
    });
    await notifyAdmins({
        title: "Driver Profile Rejected",
        message: `Admin action: The driver profile of ${driver.name} has been rejected. Driver has been asked to resubmit.`,
        senderId: adminId,
        type: "warning",
        link: "/admin/dashboard/driver-approvals",
        metadata: { driverId: driver._id, profileId }
    });
};

/**
 * EVENT: System settings updated (admin only)
 */
export const notifySettingsUpdated = async ({ adminId, updatedKeys }) => {
    await notifyAdmins({
        title: "System Settings Updated",
        message: `Platform configuration has been updated. Changed sections: ${updatedKeys.join(", ")}.`,
        senderId: adminId,
        type: "info",
        link: "/admin/dashboard/settings",
        metadata: { updatedKeys }
    });
};

/**
 * EVENT: Pricing updated — notify all drivers
 */
export const notifyPricingUpdated = async ({ adminId, newPricing, surgeMultiplier }) => {
    await notifyDrivers({
        title: "Fare Rates Updated",
        message: "RouteMate has updated its fare structure. Please review the new rates before accepting rides.",
        senderId: adminId,
        type: "warning",
        link: "/driver/dashboard",
        metadata: { newPricing, surgeMultiplier }
    });
    await notifyPassengers({
        title: "Pricing Update Notice",
        message: "RouteMate has updated its fare rates. Prices may vary slightly on your next ride.",
        senderId: adminId,
        type: "info",
        link: "/passenger/dashboard",
        metadata: {}
    });
};
