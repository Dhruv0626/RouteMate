import UserModel from "../models/UserModel.js";
import DriverProfileModel from "../models/DriverProfileModel.js";
import NotificationModel from "../models/NotificationModel.js";
import cacheService from "../utils/redis.js";

/**
 * Get core statistics for the admin dashboard
 * Provides: 
 * - Total User Counts (Users, Passengers, Drivers)
 * - Platform Health (Active/Online Drivers)
 * - Financial Overview (Estimated Revenue based on completed rides - demo logic for now)
 */
export const GetDashboardStats = async (req, res) => {
    try {
        // 🔐 Check Cache First
        const cacheKey = "admin:dashboard-stats";
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
            return res.status(200).json({
                success: true,
                stats: cachedData,
                source: "cache" // Trace metadata for verification
            });
        }

        // 1. Parallelize all counts to avoid sequential DB bottlenecks
        const [
            totalUsers,
            passengers,
            drivers,
            admins,
            approvedDrivers,
            onlineDrivers,
            completionAggr
        ] = await Promise.all([
            UserModel.countDocuments(),
            UserModel.countDocuments({ role: "passenger" }),
            UserModel.countDocuments({ role: "driver" }),
            UserModel.countDocuments({ role: "admin" }),
            DriverProfileModel.countDocuments({ isApproved: true }),
            DriverProfileModel.countDocuments({ isOnline: true }),
            DriverProfileModel.aggregate([
                { $group: { _id: null, totalCompleted: { $sum: "$completedRides" } } }
            ])
        ]);

        const totalCompletedRides = completionAggr[0]?.totalCompleted || 0;
        const pendingDrivers = drivers - approvedDrivers;

        // Avg fare logic
        const estimatedRevenue = totalCompletedRides * 150;

        const stats = {
            counts: {
                total: totalUsers,
                passengers,
                drivers,
                admins
            },
            drivers: {
                approved: approvedDrivers,
                pending: pendingDrivers,
                online: onlineDrivers
            },
            business: {
                totalRides: totalCompletedRides,
                revenue: estimatedRevenue
            }
        };

        // 📥 Store in Cache for 5 minutes (300 seconds)
        await cacheService.set(cacheKey, stats, 300);

        return res.status(200).json({
            success: true,
            stats,
            source: "db" // Trace metadata for verification
        });

    } catch (error) {
        console.error("Admin Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Get specific device/health analytics for Security/System pages
 */
export const GetSystemHealth = async (req, res) => {
    try {
        // Implementation for system status checks, CPU, memory, etc.
        // For now, return basic operational status
        return res.status(200).json({
            success: true,
            system: {
                status: "Operational",
                uptime: process.uptime(),
                version: "1.2.4-alpha",
                regions: ["Ahmedabad Central", "Ahmedabad North", "SG Highway"],
                latency: "24ms"
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Get audit logs for administrative actions
 * Fetches all platform-wide events and specifically admin-relevant notifications
 */
export const GetAuditLogs = async (req, res) => {
    try {
        const { limit = 50, page = 1, category } = req.query;
        const skip = (page - 1) * limit;

        // Query: Only get events that were sent to this admin (to ensure personalized view)
        // or system-wide notification-type events
        const query = { 
            recipient: req.user.id,
            type: "notification"
        };
        
        // Potential future enhancement: filtering by category in metadata
        // if (category) query["metadata.category"] = category;

        const total = await NotificationModel.countDocuments(query);
        const logs = await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("sender", "name role email")
            .populate("recipient", "name role");

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            logs: logs.map(log => ({
                id: log._id,
                action: log.title,
                actor: log.sender?.name || "System",
                actorRole: log.sender?.role || "Automated",
                target: log.link || "System Internal",
                date: log.createdAt,
                status: "success", // For now, since logs are generated on success
                category: log.metadata?.action ? "security" : (log.metadata?.profileId ? "driver" : "system"),
                urgent: log.metadata?.action === "blocked",
                details: log.message,
                metadata: log.metadata
            }))
        });

    } catch (error) {
        console.error("Audit Logs Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch audit logs." });
    }
};
