import UserModel from "../models/User.js";
import { io } from "../../server.js";

// ─── Core Primitives ──────────────────────────────────────────────────────────

/**
 * Notify a SINGLE user by their ID
 */
export const notifyUser = async ({ userId, title, message, senderId = null, type = "info", link = null, metadata = {} }) => {
    try {
        const notification = await NotificationModel.create({ recipient: userId, sender: senderId, title, message, type, link, metadata });
        
        // ─── INSTANT SOCKET DELIVERY ──────────────────────────────────────────
        io.to(userId.toString()).emit("new_notification", notification);
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

        const result = await NotificationModel.insertMany(notifications);
        
        // ─── INSTANT SOCKET DELIVERY (Multi-cast) ─────────────────────────────
        result.forEach(notification => {
            io.to(notification.recipient.toString()).emit("new_notification", notification);
        });
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
 * EVENT: System settings updated (admin only + targeted roles based on context)
 */
export const notifySettingsUpdated = async ({ adminId, updateData }) => {
    // Human readable mappings
    const keyMap = {
        pricing: "Fare Pricing Models",
        surgeMultiplier: "Surge Rate Multiplier",
        commission: "Platform Fee Slice",
        appName: "Application Branding",
        supportEmail: "Support Email Address",
        maintenanceMode: "System Maintenance Mode",
        autoApproveDrivers: "Driver Auto-Approvals",
        enableCrypto: "Crypto Payments Support",
        realTimeTracking: "Real-time GPS Tracking",
        maxRadius: "Maximum Ride Radius",
    };
    
    const changedFields = Object.keys(updateData);
    const readableChanges = changedFields.map(key => keyMap[key] || key);
    
    // 1. Notify Admins exactly what changed
    await notifyAdmins({
        title: "System Settings Adjusted ⚙️",
        message: `Platform configuration updated. Changed sections: ${readableChanges.join(", ")}.`,
        senderId: adminId,
        type: "info",
        link: "/admin/dashboard/system-settings",
        metadata: { changedFields }
    });

    // 2. Target specific users based on what was modified
    // Commission change -> Notify Drivers
    if (updateData.commission !== undefined) {
        await notifyDrivers({
            title: "Platform Fee Updated",
            message: `RouteMate's platform commission fee has been adjusted to ${updateData.commission}. Check your dashboard for more details.`,
            senderId: adminId,
            type: "info",
            link: "/driver/dashboard",
            metadata: { commission: updateData.commission }
        });
    }

    // Maintenance Mode toggle -> Inform Users
    if (updateData.maintenanceMode !== undefined) {
        const on = updateData.maintenanceMode === true || String(updateData.maintenanceMode) === "true";
        if (on) {
            const msg = "RouteMate is entering Maintenance Mode briefly for essential upgrades. Ride booking may be temporarily paused.";
            await notifyDrivers({ title: "System Maintenance 🛠️", message: msg, senderId: adminId, type: "warning" });
            await notifyPassengers({ title: "System Maintenance 🛠️", message: msg, senderId: adminId, type: "warning" });
        } else {
            const msg = "Maintenance is complete! RouteMate is fully active and back online.";
            await notifyDrivers({ title: "Services Restored ✅", message: msg, senderId: adminId, type: "success" });
            await notifyPassengers({ title: "Services Restored ✅", message: msg, senderId: adminId, type: "success" });
        }
    }
    
    // Crypto payments toggle -> Inform Passengers
    if (updateData.enableCrypto !== undefined) {
        const on = updateData.enableCrypto === true || String(updateData.enableCrypto) === "true";
        const msg = on ? "Exciting news! We now support Web3 Crypto Payments for all your rides." : "Crypto payments are temporarily disabled. Please rely on card or fiat.";
        await notifyPassengers({ title: "Payment System 💳", message: msg, senderId: adminId, type: "info" });
    }
    
    // Max radius change -> Inform Everyone
    if (updateData.maxRadius !== undefined) {
        await notifyDrivers({
            title: "Ride Radius Updated 🗺️",
            message: `Your active ride-catching boundary has been adjusted to ${updateData.maxRadius}.`,
            senderId: adminId,
            type: "info",
            link: "/driver/dashboard",
        });
        await notifyPassengers({
            title: "Ride Radius Updated 🗺️",
            message: `We've updated our service boundaries. Maximum ride distance has changed to ${updateData.maxRadius}.`,
            senderId: adminId,
            type: "info",
            link: "/passenger/dashboard",
        });
    }
};

/**
 * EVENT: Pricing updated — notify all drivers and admins (excluding passengers)
 */
export const notifyPricingUpdated = async ({ adminId, newPricing, surgeMultiplier, isIncrease }) => {
    let title = "Fare Rates Updated ⚙️";
    let message = "RouteMate has updated its fare structure. Please review the new rates before accepting rides.";

    if (isIncrease) {
        title = "Fare Rates Increased 📈";
        message = "Great news! RouteMate has increased the fare rates. You'll now earn more per ride.";
    } else if (isIncrease === false) {
        title = "Fare Rates Decreased 📉";
        message = "Notice: RouteMate has lowered the fare rates to stay competitive in the market.";
    }

    // Notify drivers
    await notifyDrivers({
        title,
        message,
        senderId: adminId,
        type: isIncrease ? "success" : "warning",
        link: "/driver/dashboard",
        metadata: { newPricing, surgeMultiplier, isIncrease }
    });

    // Notify admins
    await notifyAdmins({
        title: "Pricing Model Adjusted",
        message: `Admin action: ${title}. New pricing models are now live on the platform.`,
        senderId: adminId,
        type: "info",
        link: "/admin/dashboard/system-settings",
        metadata: { newPricing, surgeMultiplier, isIncrease }
    });
};
